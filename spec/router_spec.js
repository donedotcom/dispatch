/**
  Done. Router Spec
  Copyright (c) 2011 Done. Corporation
*/

var assert = require('assert'),
    vows = require('vows'),
    Router = require('../lib/router'),
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
      router.on(event, function (req) {
        this.callback(null, req);
      }.bind(this));
      router.middleware(fakeRequest(method, url));
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
    topic: new Router([ { name: 'forums' } ]),
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
  'router with single top-level resource': {
    topic: new Router([ { name: 'forums' } ]),
    'GET index with format': verifyRequest('get', '/forums.json', 'resource.forums.index',
      { action : 'index' }, 'json'),
    'GET show': verifyRequest('get', '/forums/14.json', 'resource.forums.show',
      { action : 'show', id : 14 }, 'json'),
  }
}).addBatch({
  'router with single top-level resource': {
    topic: new Router([ { name: 'forums' } ]),
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
    topic: new Router([ { name: 'forums' } ]),
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
    topic: new Router([ { name : 'forums', root : true } ]),
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
    topic: new Router([ { name : 'forums' }, { name : 'threads', parent : 'forums' } ]),
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
  'router with custom actions': {
    topic: new Router([ { name: 'forums',
      customActions: [ { name: 'browse', method: 'GET', scope: 'collection' },
        { name: 'choose', method: 'GET', scope: 'element' } ] }
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