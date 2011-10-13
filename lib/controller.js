/**
  Done. Controller -- inherited parent object for Done. controllers
  Copyright (c) 2011 Done. Corporation
*/
var util = require('util'),
    path = require('path'),
    Render = require('./render'),
		_ = require('underscore')._;

/**
  @param resource Object with { *name : resourceName, parent : resourceName, customActions : resourceActions, root : true }
  Name is required
  parent defaults to empty.
  customActions is any actions in addition to the basic RESTful CRUD, in the format:
    [ { name: 'name', method: 'GET'|'PUT'|'POST'|'DELETE', scope: 'element'|'collection' } ]
    All fields are required for custom actions.
  If root is true, this resource exists at /.  There can only be one root resource, and any parent value is ignored.
*/
var Controller = module.exports = function (params) {
  _.bindAll(this);

  this.name = params.name;
  this.parent = params.parent;
  this.customActions = params.customActions || [];
  this.root = params.root;
  this.renderHelper = new Render({ dir : path.join(process.cwd(), 'app', 'views', this.name) });
  this.logger = require('./logger');
  this.queue = [];
  this.running = false;

  if (!this.name) {
    this.logger.warn('No name for controller', params);
  }
}

Controller.extend = function (classFunctions, objectFunctions) {
  var Klass = this,
      Child;

  Child = function (obj) {
    Klass.call(this, obj);
  };
  util.inherits(Child, Klass);

  // Copy functions to the child
  _.extend(Child, Klass, classFunctions);
  _.extend(Child.prototype, Klass.prototype, objectFunctions);

  Child.beforeHooks = {};

  return Child;
};

/**
  Add a function to be run before the actions in question.  Multiple functions
  on the same action are executed in the order they are added.

  @param actions Array, single action, or 'all'
  @param fn Function, or attribute name to be executed
    fn(req, res, next)
  @returns none
*/
Controller.before = function (actions, fn) {
  var self = this;
  self.beforeHooks = self.beforeHooks || {};

  actions = typeof actions === 'Array' ? actions : [actions];
  _.each(actions, function (action) {
    self.beforeHooks[action] = self.beforeHooks[action] || [];
    self.beforeHooks[action].push(fn);
  });
};

Controller.prototype.addRequest = function (req, res, next) {
  this.logger.debug('Pushed request on ' + this.name + ' controller queue');
  this.queue.push({ req: req, res: res, next: next });
  this.run();
};

Controller.prototype.run = function () {
  if (!this.running) {
    this.running = true;
    while (!_.isEmpty(this.queue)) {
      this._runJob(this.queue.pop());
    }
    this.running = false;
  }
};

/**
  Convenience method
  @api private
*/
Controller.prototype._runJob = function (job) {
  var self = this,
      req = job.req,
      res = job.res,
      next = job.next,
      renderHelper = this.renderHelper,
      beforeHooks;

  // Render helper function
  res.render = function (options) {
    return renderHelper.render(req, res, next, options || {});
  };

  /**
    Redirect with a default status of 302
  */
  res.redirect = function (url, status) {
    this.statusCode = status || 302;
    this.setHeader('Location', url);
    this.end();
  }

  /**
    Copy incoming flash to the request and reset the session flash.
    This function will add to the flash for the next request.
  */
  req.currentFlash = req.session.flash || {};
  req.session.flash = {};
  res.flash = function (type, message) {
    var messages = req.session.flash[type] || [];
    messages.push(message);
    req.session.flash[type] = messages;
  };
  res.flash.now = function (type, message) {
    var messages = req.currentFlash[type] || [];
    messages.push(message);
    req.currentFlash[type] = messages;
  }

  if (!_.isFunction(this[req.action])) {
  	throw new Error('The action ' + req.action + ' has not been implemented yet');
    return;
  }

  beforeHooks = (this.constructor.beforeHooks.all || []).concat(this.constructor.beforeHooks[req.action]);
  this._invokeSerial(_.compact(beforeHooks), function (hook, callback) {
    if (typeof hook === 'function') {
      hook.call(self, req, res, callback);
    } else {
      self[hook].call(self, req, res, callback);
    }
  }, function (err) {
    self[req.action].call(this, req, res, next);
  });
};

/**
  Map function over each item in the array in order, calling callback when complete
  fn = function (item, callback)
  options:
    continueOnError : true if you want the execution to continue even if there's an error
      (will still stop on exception)
*/
Controller.prototype._invokeSerial = function (ar, fn, callback, options) {
  var context = this,
    i = -1;

  options = options || {};

  function _callback(err) {
    i += 1;
    if (i >= ar.length || (err && options.continueOnError !== true)) {
      callback(err);
    } else {
      fn.call(context, ar[i], _callback);
    }
  }

  _callback();
};
