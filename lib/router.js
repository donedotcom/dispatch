/**
  Done. Connect-based middleware implementing a resource-oriented, event-based route handling system
  Copyright (c) 2011 Done. Corporation

  Resources are added to the router at creation time or using addResource().
*/
var EventEmitter2 = require('eventemitter2').EventEmitter2,
    util = require('util'),
    lingo = require('lingo'),
    logger = require('./logger'),
		_ = require('underscore')._;

/**
  Resources are passed as an array of resources in the same format as addResource.
*/
var Router = function (resources) {
  EventEmitter2.call(this, { wildcard: true });
  _.bindAll(this);

  this.routes = [ ];   // Ordered list of routes
  this.actions = { };  // Keyed off of resource name

  if (resources) {
    _.each(resources, function (resource) {
      this.addResource(resource);
    }.bind(this));
  }
};
util.inherits(Router, EventEmitter2);

// parameterMatch: true must be set only on actions that can be selected
// by default if the method and scope are correct (for example, GET /resources/14 will
// match the show action).
Router.prototype.DefaultActions = [
  { name: 'index', method: 'GET', scope: 'collection', parameterMatch: true },
  { name: 'show', method: 'GET', scope: 'element', parameterMatch: true },
  { name: 'edit', method: 'GET', scope: 'element' },
  { name: 'update', method: 'PUT', scope: 'element', parameterMatch: true },
  { name: 'new', method: 'GET', scope: 'collection' },
  { name: 'create', method: 'POST', scope: 'collection', parameterMatch: true },
  { name: 'destroy', method: 'DELETE', scope: 'element', parameterMatch: true },
];

/**
  @param resource Object with { *name : resourceName, parent : resourceName, customActions : resourceActions, root : true }
  Name is required
  parent defaults to empty.
  customActions is any actions in addition to the basic RESTful CRUD, in the format:
  [ { name: 'name', method: 'GET'|'PUT'|'POST'|'DELETE', scope: 'element'|'collection' } ]
  All fields are required for custom actions.
  If root is true, this resource exists at /.  There can only be one root resource, and any parent value is ignored.
  @returns Undefined
*/
Router.prototype.addResource = function (resource) {
  // Store routes so that we can take an incoming URL, identify the resource, the action, and any IDs
  // addResource({ name: 'parents' })
  // addResource({ name: 'children', parent : 'parents' })
  // addResource({ name: 'grandchildren', parent : 'children' })
  // /parents/:parent_id/children/:child_id/grandchildren
  var route = '^',
      parentRoute,
      matchGroup = '/?(?:/([^/]+)/?)?(?:/([^/]+))?$',
      routeObject,
      insertIndex = (-1);

  if (this._findRoute(resource.name)) {
    logger.warn('Router: routes already exist for resource; may overwrite', resource);
  }

  if (resource.parent) {
    parentRoute = this._findRoute(resource.parent);
    if (!parentRoute) {
      logger.error('Parent resource not found: must add parent before children', resource);
      return;
    }
    // Children get inserted before their parents to make sure the routes are found properly
    insertIndex = this.routes.indexOf(parentRoute) - 1;
    route = parentRoute.route.slice(0, -1); // Remove the '$'
    logger.debug('Found parent route ' + route);
  }

  if (resource.root) {
    route = route + matchGroup;
  } else {
    route = route + '/' + resource.name + matchGroup;
  }

  resource.customActions = resource.customActions || [];
  _.map(resource.customActions, function (action) {
    action.method = action.method.toUpperCase();
    return action;
  });
  this.actions[resource.name] = resource.customActions.concat(this.DefaultActions);

  routeObject = { name: resource.name, route : route, parent : parentRoute, root : resource.root };
  this.routes.splice(insertIndex, 0, routeObject);
  this._createRouteHelper(resource, routeObject);

  logger.debug('Adding new route ' + route, { actions : _.map(this.actions[resource.name], function (action) {
    return action.name + '(' + action.method + ', ' + action.scope + ')';
  }) });

};

// This function should be passed as the middleware to Connect
Router.prototype.middleware = function (req, res, next) {
  var url = req.url.split('?')[0];
  var method, actions;
  var resource, matches, action;
  var obj; // iterator
  var parentId; // for storing the name of the parent id

  logger.debug('Router URL ' + url + ' (' + req.method + ')');

  // Detect the format
  matches = url.match(/\.(\w+)$/);
  if (!_.isEmpty(matches)) {
    req.format = _.compact(matches)[1].toLowerCase();
    url = url.replace(/\.\w+$/, '');
    logger.debug('Detected format: ' + req.format);
  }

  resource = _.detect(this.routes, function (route) {
    var regexp = route.route;

    logger.debug('Testing ' + regexp);
    matches = url.match(regexp);

    if (!_.isEmpty(matches)) {
      matches = _.compact(matches).slice(1);
      logger.debug('Found resource ' + route.name, matches);
      return route.name;
    }
  }.bind(this));

  if (resource) {
    // Filter available actions by method
    method = req.method.toUpperCase();
    actions = _.filter(this.actions[resource.name], function (action) {
      return action.method === method;
    });

    // See if there is a direct match
    action = _.detect(actions, function (action) {
      return action.name === _.last(matches)
    });
    if (action) {
      logger.debug('Direct match', action);
      matches.pop();
      if (!this._checkRequestAction(resource, action, matches)) {
        action = null;
      }
    } else {
      // Custom actions cannot match by parameter (only index, create, update)
      action = _.detect(_.filter(actions, function (action) {
        return action.parameterMatch === true;
      }), function (action) {
        if (this._checkRequestAction(resource, action, matches)) {
          logger.debug('Parameter match', action);
          return action;
        }
      }.bind(this));
    }

    if (!action) {
      logger.info('No available action found for ' + url);
      next();
    } else {
      logger.info('Found action', action);
      req.action = action.name;

      if (action.scope === 'element') {
        req.id = matches.pop();
      }

      // Walk up and assign ids
      obj = resource.parent;
      while (obj && !_.isEmpty(matches)) {
        parentId = lingo.en.singularize(obj.name) + '_id';
        logger.debug('Adding parent ID to request: ' + parentId + ' = ' + _.last(matches));
        req[parentId] = matches.pop();
      }
      this.emit('resource.' + resource.name + '.' + req.action, req, res, next);
    }
  } else {
    next();
  }
};

Router.prototype._findRoute = function (name) {
  return _.detect(this.routes, function (route) {
    return route.name === name;
  });
};

Router.prototype._routeDepth = function (resource) {
  var depth = 0;
  while (resource.parent) {
    resource = resource.parent;
    depth += 1;
  }
  return depth;
}

Router.prototype._checkRequestAction = function (resource, action, matches) {
  var paramCount = matches.length - this._routeDepth(resource);
  if (!action) {
    return false;
  }

  logger.debug('Testing action (param count: ' + paramCount + ')', action);

  if (action.scope === 'element' && paramCount !== 1) {
    return false; // Requires exactly one element
  } else if (action.scope === 'collection' && paramCount !== 0) {
    return false; // Requires no element
  }
  return true;
};

/**
  Create URL path generators.

  @param {String} orig
  @api private
*/
Router.prototype._createRouteHelper = function (resource, route) {
  var self = this,
      collectionName = resource.name,
      elementName = lingo.en.singularize(resource.name),
      baseHelper = [],
      baseTemplate = [];

  // Actions that don't appear in the helper name or the URL directly
  // eg, use forums_path() instead of forums_index_path()
  var silentActions = ['index', 'show', 'create', 'update', 'destroy'];

  // Generates a string that can be exported to the client without dependencies.
  // See also the _buildRouteHelper, below.
  if (!self.path) {
    var path = {};
    path.toString = function () {
      var res;

      res = 'var path = {\n';
      _.each(_.keys(path), function (name) {
        if (name !== 'toString') {
          res += name + ' : ' + path[name].toString() + ',\n';
        }
      });
      res += '};'
      return res;
    }
    self.path = path;
  }

  logger.debug('Create route helper', { route : route });

  // Create the parent path and names -- applied to all actions
  this._buildParentRouteHelpers(route, baseHelper, baseTemplate);

  // Go through each action on this resource and build a helper
  _.each(self.actions[resource.name], function (action) {
    var helper = _.clone(baseHelper),
        template = _.clone(baseTemplate),
        actionName = silentActions.indexOf(action.name) === (-1) ? action.name : null;

    if (!resource.root) {
      template.push(resource.name);
    }

    helper.unshift(actionName);
    if (action.scope === 'collection') {
      action.name === 'new' ? helper.push(elementName) : helper.push(collectionName);
      template.push(actionName);
    } else {
      helper.push(elementName);
      template.push(self._buildPathId(elementName), actionName);
    }

    self.path[_.compact(helper).join('_') + '_path'] = self._buildRouteHelper(template, resource.idField);
  });

  logger.debug('Path helpers', { paths : _.keys(self.path) });
};

/**
  When a route is nested, its helper function and URL both reflect that.  This function
  creates the parent information for both.
  @api private
*/
Router.prototype._buildParentRouteHelpers = function (obj, helper, template) {
  var elementName;

  obj = obj.parent;
  while (obj) {
    elementName = lingo.en.singularize(obj.name);
    helper.unshift(elementName);
    template.unshift(obj.root ? null : obj.name, this._buildPathId(elementName))
    obj = obj.parent;
  }
};

/**
  We construct a path ID that is replaced when the helper is used.  The name is not actually
  that important.
  @api private
*/
Router.prototype._buildPathId = function (name) {
  name = lingo.en.singularize(name);
  return ':' + name + '_id';
};

/**
  Create the actual route helper from the template and pass it back
  @api private
*/
Router.prototype._buildRouteHelper = function (template, idField) {
  var path = '/' + _.compact(template).join('/'),
      idField = idField || 'id',
      fn = function () {
        var localPath = path;
        _.each(arguments, function (arg) {
          localPath = localPath.replace(/:\w+/, arg[idField] || arg);
        });
        return localPath;
      };

  // This function exists so that we can export the paths to the client side.  If you
  // modify the function above, you should make sure this is also runnable without any
  // of the server-side context.
  fn.toString = function () {
    return 'function () { ' +
      'var localPath = "' + path + '";' +
      '_.each(arguments, function (arg) { ' +
        'localPath = localPath.replace(/:\\w+/, arg["' + idField + '"] || arg);' +
      '});' +
      'return localPath;' +
    '}'
  };

  return fn;
};

module.exports = Router;