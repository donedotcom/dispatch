/**
  Done. controller spec
  Copyright (c) 2011 Done. Corporation
*/
var assert = require('assert'),
    vows = require('vows'),
    Controller = require('../lib/controller'),
    _ = require('underscore')._,
    ForumsController;

var req = {
  session: {
    flash: 'flash message'
  },
  method: 'GET',
  url: 'http://localhost:3000/forums'
};
var res = {
  status: 200,
  flash: 'new flash message'
};
var next = function () {
  throw 'next should not be called';
};

// A global to inform whether a custom action has been called or not.
// Set to false before defining a custom action (i.e., in the topic).
var actionsCalled = [],
  hooks;

function defineAction (actionName) {
  return function (req, res, next) {
    actionsCalled[actionName] = true;
    return;
  };
}
function defineHook (hookName) {
  return function (req, res, callback) {
    customActionCounter++;
    hooks.push(hookName);
    callback();
  };
}

/**
  Returns an object that is passed into a Vows batch.
  @param controller
  @param expectedActions An array of actions that should be run
  @param expectedHooks An array of hooks that should be run in order
*/

function testControllerActions (controller, expectedActions, expectedHooks) {
  var tests = {
    'topic': controller,
    'action processed correctly' : function (controller) {
      var error = false;
      actionsCalled = [];
      customActionCounter = 0;
      controller.on('error', function (err) {
        error = err;
      });
      
      expectedActions.forEach(function (action) {
        req.action = action;
        controller.addRequest(req, res, next);
        assert.isTrue(actionsCalled[action]);
      });
      assert.isFalse(error);
      assert.strictEqual(customActionCounter, expectedHooks.length);
      expectedHooks.forEach(function (hook, i) {
        assert.strictEqual(hooks[i], hook);
      });
    },
    'req has an implemented action' : function (controller) {
      var error = false;
      customActionCounter = 0;
      actionsCalled = [];
      controller.on('error', function (err) {
        error = err;
      });
      expectedActions.forEach(function (action) {
        req.action = action;
        controller.addRequest(req, res, next);
        assert.isTrue(actionsCalled[action]);
      });
      assert.isFalse(error);
      assert.strictEqual(customActionCounter, expectedHooks.length);
    },
    'req has an unimplemented action' : function (controller) {
      var error = false;
      controller.on('error', function (err) {
        error = err;
      });
      req.action = 'futureAction';
      controller.addRequest(req, res, next);
      assert.isTrue(new RegExp(/has not been implemented yet/).test(error.message));
    }
  }
  return tests;
}

vows.describe('Controller').addBatch({
  'controller initialization' : {
    topic : function () {
      ForumsController = Controller.extend();
      return new ForumsController({ name: 'forums' });
    },
    'render directory should be set correctly' : function (controller) {
      var directory = controller.renderHelper.directory.split('/');
      assert.strictEqual(directory[directory.length - 1], 'forums');
    }
  }
}).addBatch({
  'a controller with a beforeHook on one custom action' : testControllerActions(function () {
    hooks = [];
    var ForumsController = Controller.extend();
    ForumsController.prototype.myCoolAction = defineAction('myCoolAction');

    ForumsController.before('myCoolAction', defineHook('hook1'));

    return new ForumsController({
      name: 'forums'
    });
  }, ['myCoolAction'], ['hook1'])
}).addBatch({
  'a controller with a beforeHook on all actions' : testControllerActions(function () {
    hooks = [];
    var ForumsController = Controller.extend();
    ForumsController.prototype.myCoolAction = defineAction('myCoolAction');
    ForumsController.prototype.secondAction = defineAction('secondAction');
    ForumsController.prototype.thirdAction = defineAction('thirdAction');

    ForumsController.before('all', defineHook('hook2'));

    return new ForumsController({
      name: 'forums'
    });
  }, ['myCoolAction', 'secondAction', 'thirdAction'], ['hook2', 'hook2', 'hook2'])
}).addBatch({
  'a controller with a beforeHook on two actions' : testControllerActions(function () {
    hooks = [];
    var ForumsController = Controller.extend();
    ForumsController.prototype.myCoolAction = defineAction('myCoolAction');
    ForumsController.prototype.secondAction = defineAction('secondAction');
    ForumsController.prototype.thirdAction = defineAction('thirdAction');

    ForumsController.before(['myCoolAction', 'thirdAction'], defineHook('hook3'));

    return new ForumsController({
      name: 'forums'
    });
  }, ['myCoolAction', 'secondAction', 'thirdAction'], ['hook3', 'hook3'])
}).addBatch({
  'a controller with a beforeHook on two actions' : testControllerActions(function () {
    hooks = [];
    var ForumsController = Controller.extend();
    ForumsController.prototype.myCoolAction = defineAction('myCoolAction');
    ForumsController.prototype.secondAction = defineAction('secondAction');
    ForumsController.prototype.thirdAction = defineAction('thirdAction');

    ForumsController.before('myCoolAction', defineHook('hook4'));
    ForumsController.before(['myCoolAction', 'thirdAction'], defineHook('hook5'));
    ForumsController.before('all', defineHook('hook6'));

    return new ForumsController({
      name: 'forums'
    });
  }, ['myCoolAction', 'secondAction', 'thirdAction'], ['hook6', 'hook4', 'hook5', 'hook6', 'hook6', 'hook5'])
}).addBatch({
  'a controller with a beforeHook on two actions' : {
    'topic' : function () {
      var ForumsController = Controller.extend();
      ForumsController.prototype.errorAction = function (req, res) {
        res.error(new Error('error'));
      };

      return new ForumsController({
        name: 'forums'
      });
    },
    'should have a status code of 500' : function (controller) {
      controller.on('error', function (err) {
        // noop
      });
      
      req.action = 'errorAction';
      controller.addRequest(req, res, next);
      assert.strictEqual(res.statusCode, 500);
    }
  }
}).addBatch({
  'a controller with a beforeHook that stops the chain' : {
    'topic' : function () {
      var ForumsController = Controller.extend();

      ForumsController.before('validatedAction', 'validate');
      ForumsController.before('validatedAction', 'secondHook');

      ForumsController.prototype.validatedAction = function (req, res) {
        res.render({ statusCode : 200 });
      };
      
      ForumsController.prototype.validate = function (req, res, next) {
        res.render({ statusCode : 404 });
        next('stop'); // any truthy value will work
      };

      ForumsController.prototype.secondHook = function (req, res, next) {
        // Should not be called
        assert.ok(false);
      };

      return new ForumsController({
        name: 'forums'
      });
    },
    'should have a status code of 404' : function (controller) {
      controller.on('error', function (err) {
        // noop
      });
      
      req.action = 'validatedAction';
      controller.addRequest(req, res, next);
      assert.strictEqual(res.statusCode, 404);
    }
  }
}).export(module);