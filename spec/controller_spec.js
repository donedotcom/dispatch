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
var myCoolActionCalled = false;
var customActionCalled = false;

function testControllerActions (controller) {
	var tests = {
		'topic': controller,
		'action processed correctly' : function (controller) {
			var error = false;
			try {
				myCoolActionCalled = false;
				req.action = 'myCoolAction';
				controller.addRequest(req, res, next);
			} catch (err) {
				error = err;
			}
			assert.strictEqual(error, false);
			assert.strictEqual(myCoolActionCalled, true);
		},
		'req has an implemented action' : function (controller) {
			var error = false;
			customActionCalled = false;
			try {
				req.action = 'myCoolAction';
				controller.addRequest(req, res, next);
			} catch (err) {
				error = err;
			}
			assert.strictEqual(error, false);
			assert.strictEqual(customActionCalled, true);
		},
		'req has an unimplemented action' : function (controller) {
			try {
				req.action = 'futureAction';
				controller.addRequest(req, res, next);
			} catch (err) {
				assert.strictEqual(new RegExp(/has not been implemented yet/).test(err.message), true);
			}
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
		ForumsController = Controller.extend();
		ForumsController.prototype.myCoolAction = function (req, res, next) {
			myCoolActionCalled = true;
			return;
		};
		ForumsController.before('myCoolAction', function (req, res, callback) {
			customActionCalled = true;
			callback();
		});
		return new ForumsController({
			name: 'forums'
		});
	})
}).addBatch({
  'a controller with a beforeHook on all actions' : testControllerActions(function () {
		customActionCalled = false;
		ForumsController = Controller.extend();
		ForumsController.prototype.myCoolAction = function (req, res, next) {
			myCoolActionCalled = true;
			return;
		};
		ForumsController.before('all', function (req, res, callback) {
			customActionCalled = true;
			callback();
		});
		return new ForumsController({
			name: 'forums'
		});
	})
}).export(module);