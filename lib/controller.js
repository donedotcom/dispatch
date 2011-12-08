/**
  Done. Controller -- inherited parent object for Done. controllers
  Copyright (c) 2011 Done. Corporation
*/
var EventEmitter = require('events').EventEmitter,
    util = require('util'),
    path = require('path'),
    Render = require('./render'),
    config = require('../index').config,
    _ = require('underscore')._;

/**
  @param resource Object with { *name : resourceName, parent : resourceName, customActions : resourceActions, root : true }
  Name is required
  parent defaults to empty.
  customActions is any actions in addition to the basic RESTful CRUD, in the format:
    [ { name: 'name', method: 'GET'|'PUT'|'POST'|'DELETE', scope: 'element'|'collection' } ]
    All fields are required for custom actions.
  If root is true, this resource exists at /.  There can only be one root resource, and any parent value is ignored.

  responseHelpers is an optional parameter of options and can be used to override any of the default helpers (render, flash, redirect)
*/
var Controller = module.exports = function (options) {
  EventEmitter.call(this);
  _.bindAll(this);

  this.name = options.name;
  this.parent = options.parent;
  this.customActions = options.customActions || [];
  this.root = options.root;
  this.renderHelper = new Render({ dir : path.join(process.cwd(), 'app', 'views', this.name) });
  this.logger = require('./logger');
  this.queue = [];
  this.running = false;
  this.responseHelpers = options.helpers || {};

  var self = this;
  var defaultHelpers = {
    render: function (req, res) {
      return function (options) {
        self.renderHelper.render(req, res, res.error, options || {});
      };
    },
    flash: function (req, res) {
      /**
        Copy incoming flash to the request and reset the session flash.
        This function will add to the flash for the next request.
      */
      req.currentFlash = req.session.flash || {};
      req.session.flash = {};
      var flash = function (type, message) {
        var messages = req.session.flash[type] || [];
        messages.push(message);
        req.session.flash[type] = messages;
      };
      flash.now = function (type, message) {
        var messages = req.currentFlash[type] || [];
        messages.push(message);
        req.currentFlash[type] = messages;
      };
      return flash;
    },
    redirect: function (req, res) {
      /**
        Redirect with a default status of 302
      */
      return function (url, status) {
        res.statusCode = status || 302;
        res.setHeader('Location', url);
        res.end();
      };
    }
  };
  _.defaults(this.responseHelpers, defaultHelpers);

  if (!this.name) {
    this.logger.get().warn('No name for controller', options);
  }
}
util.inherits(Controller, EventEmitter);

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

  actions = actions instanceof Array ? actions : [actions];
  _.each(actions, function (action) {
    self.beforeHooks[action] = self.beforeHooks[action] || [];
    self.beforeHooks[action].push(fn);
  });
};

Controller.prototype.addRequest = function (req, res, next) {
  this.logger.get().debug('Pushed request on ' + this.name + ' controller queue');
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
      renderHelper = this.renderHelper,
      beforeHooks;

  res.next = job.next; // Most functions won't need this, but we store it in case

  // Add helpers to request (using custom versions if passed to controller constructor)
  _.each(this.responseHelpers, function (helperFunction, helperName) {
    res[helperName] = helperFunction(req, res);
  });

  if (!_.isFunction(this[req.action])) {
    res.statusCode = 404;
    this.emit('error', new Error('The action ' + req.action + ' has not been implemented yet'), req, res);
    return;
  }

  beforeHooks = (this.constructor.beforeHooks.all || []).concat(this.constructor.beforeHooks[req.action]);
  this._invokeSerial(_.compact(beforeHooks), function (hook, callback) {
    try {
      if (typeof hook === 'function') {
        hook.call(self, req, res, callback);
      } else if (self[hook]) {
        self[hook].call(self, req, res, callback);
      } else {
        res.statusCode = 500;
        self.emit('error', new Error('beforeHook not found: ' + hook), req, res)
      }
    } catch (err) {
      // Exception in before hooks
      res.statusCode = res.statusCode || 500;
      self.emit('error', err, req, res);
    }
  }, function (err) {
    if (err) {
      // From a before hook, you can abort the chain by passing a truthy value in error.
      // For an actual error, pass us an instance of error or the string 'error'
      if (err instanceof Error || err === 'error') {
        // Error in before hooks
        res.statusCode = res.statusCode || 500;
        self.emit('error', err, req, res);
      }
    } else {
      // Call the action

      // This function can be called by the controller in case of a server error
      res.error = function (err) {
        res.statusCode = res.statusCode || 500;
        self.emit('error', err, req, res);
      };

      self[req.action].call(this, req, res)
    }
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
