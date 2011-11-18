/**
  Done. Router Path generation spec
  Copyright (c) 2011 Done. Corporation
*/
var assert = require('assert'),
    vows = require('vows'),
    Router = require('../lib/router'),
    resource = require('./helper').resource,
    _ = require('underscore')._;

var forum = { id : 5 },
    thread = { id : 50 },
    user = { id : 1 };

vows.describe('Router Path').addBatch({
  'single level resource' : {
    topic : new Router([ resource({ name: 'forums' }) ]),
    'index or create' : function (router) {
      assert.strictEqual(router.path.forums_path(), '/forums');
    },
    'new' : function (router) {
      assert.strictEqual(router.path.new_forum_path(), '/forums/new');
    },
    'show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_path(forum), '/forums/5');
    },
    'edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_path(forum), '/forums/5/edit');
    }
  }
}).addBatch({
  'single level singular resource' : {
    topic : new Router([ resource({ name : 'home', singular : true, customActions : [
      { name : 'move', method : 'GET', /* scope is always collection */ }
    ] }) ]),
    'index or create' : function (router) {
      assert.strictEqual(router.path.home_path(), '/home');
    },
    'GET' : function (router) {
      assert.strictEqual(router.path.move_home_path(), '/home/move');
    }
  }
}).addBatch({
  'single level nesting' : {
    topic : new Router([ resource({ name : 'forums' }), resource({ name : 'threads', parent : 'forums' }) ]),
    'index or create' : function (router) {
      assert.strictEqual(router.path.forums_path(), '/forums');
    },
    'new' : function (router) {
      assert.strictEqual(router.path.new_forum_path(), '/forums/new');
    },
    'show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_path(forum), '/forums/5');
    },
    'edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_path(forum), '/forums/5/edit');
    },
    'nested index or create' : function (router) {
      assert.strictEqual(router.path.forum_threads_path(forum), '/forums/5/threads');
    },
    'nested new' : function (router) {
      assert.strictEqual(router.path.new_forum_thread_path(forum), '/forums/5/threads/new');
    },
    'nested show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_thread_path(forum, thread), '/forums/5/threads/50');
    },
    'nested edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_thread_path(forum, thread), '/forums/5/threads/50/edit');
    }
  }
}).addBatch({
  'top level resource nesting' : {
    topic : new Router([ 
      resource({ name : 'forums', root : true }), 
      resource({ name : 'threads', parent : 'forums' }) 
    ]),
    'index or create' : function (router) {
      assert.strictEqual(router.path.forums_path(), '/');
    },
    'new' : function (router) {
      assert.strictEqual(router.path.new_forum_path(), '/new');
    },
    'show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_path(forum), '/5');
    },
    'edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_path(forum), '/5/edit');
    },
    'nested index or create' : function (router) {
      assert.strictEqual(router.path.forum_threads_path(forum), '/5/threads');
    },
    'nested new' : function (router) {
      assert.strictEqual(router.path.new_forum_thread_path(forum), '/5/threads/new');
    },
    'nested show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_thread_path(forum, thread), '/5/threads/50');
    },
    'nested edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_thread_path(forum, thread), '/5/threads/50/edit');
    }
  }
}).addBatch({
  'top level resource nesting out-of-order loading': {
    topic: new Router([ resource({ name : 'threads', parent : 'forums' }), resource({ name : 'forums' }) ]),
    // Don't need full tests, just need to make sure it actually loads properly
    'index or create' : function (router) {
      assert.strictEqual(router.path.forums_path(), '/forums');
    },
    'nested index or create' : function (router) {
      assert.strictEqual(router.path.forum_threads_path(forum), '/forums/5/threads');
    },
  } 
}).addBatch({
  'multi-level nesting' : {
    topic : new Router([ resource({ name : 'users' }), resource({ name : 'forums', parent : 'users' }),
      resource({ name : 'threads', parent : 'forums' }) ]),
    'nested index or create' : function (router) {
      assert.strictEqual(router.path.user_forum_threads_path(user, forum),
        '/users/1/forums/5/threads');
    },
    'nested new' : function (router) {
      assert.strictEqual(router.path.new_user_forum_thread_path(user, forum),
        '/users/1/forums/5/threads/new');
    },
    'nested show, delete, or update' : function (router) {
      assert.strictEqual(router.path.user_forum_thread_path(user, forum, thread),
        '/users/1/forums/5/threads/50');
    },
    'nested edit' : function (router) {
      assert.strictEqual(router.path.edit_user_forum_thread_path(user, forum, thread),
        '/users/1/forums/5/threads/50/edit');
    }
  }
}).addBatch({
  'custom actions' : {
    topic : new Router([ resource({ name: 'forums', customActions : [
      { name : 'lock', method : 'GET', scope : 'element' },
      { name : 'design', method : 'GET', scope : 'collection' }
    ] }) ]),
    'collection action' : function (router) {
      assert.strictEqual(router.path.design_forums_path(), '/forums/design');
    },
    'element action' : function (router) {
      assert.strictEqual(router.path.lock_forum_path(forum), '/forums/5/lock');
    }
  }
}).addBatch({
  'direct id value' : {
    topic : new Router([ resource({ name: 'forums' }) ]),
    'show, delete, or update (string)' : function (router) {
      assert.strictEqual(router.path.forum_path("5"), '/forums/5');
    },
    'edit (string)' : function (router) {
      assert.strictEqual(router.path.edit_forum_path("5"), '/forums/5/edit');
    },
    'show, delete, or update (int)' : function (router) {
      assert.strictEqual(router.path.forum_path(5), '/forums/5');
    },
    'edit (int)' : function (router) {
      assert.strictEqual(router.path.edit_forum_path(5), '/forums/5/edit');
    },
  }
}).addBatch({
  'custom id field' : {
    topic : new Router([ resource({ name: 'forums', idField : '_id' }) ]),
    'show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_path({ _id : 5 }), '/forums/5');
    },
    'edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_path({ _id : 5 }), '/forums/5/edit');
    },
  }
}).export(module);
