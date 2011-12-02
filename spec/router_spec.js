/**
  Done. Router Spec
  Copyright (c) 2011 Done. Corporation
*/
var assert = require('assert'),
    vows = require('vows'),
    Router = require('../lib/router'),
    resource = require('./helper').resource,
    _ = require('underscore')._;

function fakeRequest(method, url) {
  var req = { method : method,
    url : url
  };
  return req;
}

function verifyRequest(method, url, event, keys, format) {
  var test = {
    topic: function (router) {
      var callback = this.callback;

      router.on(event, function (req) {
        callback(null, req);
      });
      router.middleware(fakeRequest(method, url), {}, function (err) {
        console.error(method + ': ' + url);
        throw new Error('Should not have called next()');
      });
    },
    'should have correct action': function (err, req) {
      assert.isNull(err); // basic test because the callback won't fire if it can't find the action
    },
    'should have the right keys': function (err, req) {
      if (!_.isUndefined(keys)) {
        _.each(_.keys(keys), function (key) {
          assert.equal(req[key], keys[key]);
        });
      }
    },
    'should have the right format': function (err, req) {
      if (format) {
        assert.equal(req.format, format);
      }
    }
  };
  return test;
}

/**
Note: because of the naming of the events and parallel, asynchronous nature of each batch,
any routes that result in the same event being fired need to be tested in separate batches.
*/
vows.describe('Router').addBatch({
  'router with single top-level resource': {
    topic: new Router([ resource({ name: 'forums' }) ]),
    'GET index': verifyRequest('get', '/forums', 'resource.forums.index',
      { action : 'index' }),
    'GET show': verifyRequest('get', '/forums/14', 'resource.forums.show',
      { action : 'show', id : 14 }),
    'GET edit': verifyRequest('get', '/forums/14/edit', 'resource.forums.edit',
      { action : 'edit', id : 14 }),
    'DELETE element': verifyRequest('delete', '/forums/14', 'resource.forums.destroy',
      { action : 'destroy', id : 14 }),
    'PUT element': verifyRequest('put', '/forums/14', 'resource.forums.update',
      { action : 'update', id : 14 }),
    'POST collection': verifyRequest('post', '/forums', 'resource.forums.create',
      { action : 'create' }),
  }
}).addBatch({
  'singular router top-level resource': {
    topic: new Router([ resource({ name: 'home', singular: true, customActions : [
        { name : 'move', method : 'GET', /* scope is always collection */ }
      ] }) ]),
    'GET index': verifyRequest('get', '/home', 'resource.home.index'),
    'GET move': verifyRequest('get', '/home/move', 'resource.home.move')
  },
}).addBatch({
  'singular router top-level root': {
    topic: new Router([ resource({ name: 'home', singular: true, root : true, customActions : [
        { name : 'move', method : 'GET', /* scope is always collection */ }
      ] }) ]),
    'GET index': verifyRequest('get', '/', 'resource.home.index'),
    'GET move': verifyRequest('get', '/move', 'resource.home.move')
  },
}).addBatch({
  'router with single top-level resource': {
    topic: new Router([ resource({ name: 'forums' }) ]),
    'GET index with format': verifyRequest('get', '/forums.json', 'resource.forums.index',
      { action : 'index' }, 'json'),
    'GET show': verifyRequest('get', '/forums/14.json', 'resource.forums.show',
      { action : 'show', id : 14 }, 'json'),
  }
}).addBatch({
  'router with single top-level resource': {
    topic: new Router([ resource({ name: 'forums' }) ]),
    'GET bad action': {
      topic: function (router) {
        var cb = this.callback;
        router.on('resource.forums.show', function (req) {
          cb(this.event);
        });
        router.middleware(fakeRequest('get', '/forums/14/blahblah'), null, function () {
          cb(null);
        });
      },
      'should call next': function (err) {
        assert.isUndefined(err); // test that the next() method is called
      },
    },
  }
}).addBatch({
  'router with single top-level resource': {
    topic: new Router([ resource({ name: 'forums' }) ]),
    'GET bad resource': {
      topic: function (router) {
        var cb = this.callback;
        router.on('resource.forums.show', function (req) {
          cb(this.event);
        });
        router.middleware(fakeRequest('get', '/forumsextra'), null, function () {
          cb(null);
        });
      },
      'should call next': function (err) {
        assert.isUndefined(err); // test that the next() method is called
      },
    }
  }
}).addBatch({
  'router with root-level resource': {
    topic: new Router([ resource({ name : 'forums', root : true }) ]),
    'GET index': verifyRequest('get', '/', 'resource.forums.index',
      { action : 'index' }),
    'GET show': verifyRequest('get', '/14', 'resource.forums.show',
      { action : 'show', id : 14 }),
    'GET edit': verifyRequest('get', '/14/edit', 'resource.forums.edit',
      { action : 'edit', id : 14 }),
    'DELETE element': verifyRequest('delete', '/14', 'resource.forums.destroy',
      { action : 'destroy', id : 14 }),
    'PUT element': verifyRequest('put', '/14', 'resource.forums.update',
      { action : 'update', id : 14 }),
    'POST collection': verifyRequest('post', '/', 'resource.forums.create',
      { action : 'create' }),
  }
}).addBatch({
  'router with nested resources': {
    topic: new Router([ resource({ name : 'forums' }), resource({ name : 'threads', parent : 'forums' }) ]),
    'GET index': verifyRequest('get', '/forums', 'resource.forums.index',
      { action : 'index' }),
    'GET show': verifyRequest('get', '/forums/14', 'resource.forums.show',
      { action : 'show', id : 14 }),
    'GET edit': verifyRequest('get', '/forums/14/edit', 'resource.forums.edit',
      { action : 'edit', id : 14 }),
    'DELETE element': verifyRequest('delete', '/forums/14', 'resource.forums.destroy',
      { action : 'destroy', id : 14 }),
    'PUT element': verifyRequest('put', '/forums/14', 'resource.forums.update',
      { action : 'update', id : 14 }),
    'POST collection': verifyRequest('post', '/forums', 'resource.forums.create',
      { action : 'create' }),

    //- Nested -//
    'GET nested index': verifyRequest('get', '/forums/14/threads', 'resource.threads.index',
      { action : 'index', forum_id : 14 }),
    'GET nested show': verifyRequest('get', '/forums/14/threads/2', 'resource.threads.show',
      { action : 'show', forum_id : 14, id : 2 }),
    'GET nested edit': verifyRequest('get', '/forums/14/threads/2/edit', 'resource.threads.edit',
      { action : 'edit', forum_id : 14, id : 2 }),
    'DELETE nested element': verifyRequest('delete', '/forums/14/threads/2', 'resource.threads.destroy',
      { action : 'destroy', forum_id : 14, id : 2 }),
    'PUT nested element': verifyRequest('put', '/forums/14/threads/2', 'resource.threads.update',
      { action : 'update', forum_id : 14, id : 2 }),
    'POST nested collection': verifyRequest('post', '/forums/14/threads', 'resource.threads.create',
      { action : 'create', forum_id : 14 }),
  }
}).addBatch({
  'router with nested resources loaded out-of-order': {
    topic: new Router([ resource({ name : 'threads', parent : 'forums' }), resource({ name : 'forums' }) ]),
    // Don't need full tests, just need to make sure it actually loads properly
    'GET index': verifyRequest('get', '/forums', 'resource.forums.index',
      { action : 'index' }),
    'GET nested index': verifyRequest('get', '/forums/14/threads', 'resource.threads.index',
      { action : 'index', forum_id : 14 }),
  },
  'router with nested resources loaded out-of-order and intermediate resource requiring queueing': {
    topic: new Router([ resource({ name : 'threads', parent : 'forums' }), resource({ name : 'users' }), resource({ name : 'forums' }) ]),
    // Don't need full tests, just need to make sure it actually loads properly
    'GET index': verifyRequest('get', '/forums', 'resource.forums.index',
      { action : 'index' }),
    'GET nested index': verifyRequest('get', '/forums/14/threads', 'resource.threads.index',
      { action : 'index', forum_id : 14 }),
  },
  'root resource with resources loaded out-of-order' : {
    // Root resource is effectively the parent of all other resources and must be scheduled last
    topic : new Router([ resource({ name : 'reviews' }), resource({ name : 'forums', root : true }) ]),
    'GET forums index': verifyRequest('get', '/', 'resource.forums.index', { action : 'index' }),
    'GET show': verifyRequest('get', '/14', 'resource.forums.show',
      { action : 'show', id : 14 }),
    'GET reviews index': verifyRequest('get', '/reviews', 'resource.reviews.index', { action : 'index' }),
    'GET reviews show': verifyRequest('get', '/reviews/6', 'resource.reviews.show',
      { action : 'show', id : 6 }),
  }
}).addBatch({
  'router with custom actions': {
    topic: new Router([ resource({ name: 'forums',
      customActions: [ { name: 'browse', method: 'GET', scope: 'collection' },
        { name: 'choose', method: 'GET', scope: 'element' } ] })
    ]),
    'GET index': verifyRequest('get', '/forums', 'resource.forums.index',
      { action : 'index' }),
    'GET browse': verifyRequest('get', '/forums/browse', 'resource.forums.browse',
      { action : 'browse' }),
    'GET show': verifyRequest('get', '/forums/14', 'resource.forums.show',
      { action : 'show', id : 14 }),
    'GET edit': verifyRequest('get', '/forums/14/edit', 'resource.forums.edit',
      { action : 'edit', id : 14 }),
    'GET choose': verifyRequest('get', '/forums/14/choose', 'resource.forums.choose',
      { action : 'choose', id : 14 }),
  }
}).export(module);