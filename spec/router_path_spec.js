/**
  Done. Router Path generation spec
  Copyright (c) 2011 Done. Corporation
*/
var assert = require('assert'),
    vows = require('vows'),
    Router = require('../lib/router'),
		_ = require('underscore')._;

var forum = { id : 5 },
    thread = { id : 50 },
    user = { id : 1 };

vows.describe('Router Path').addBatch({
  'single level resource' : {
    topic : new Router([ { name: 'forums' } ]),
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
  'single level nesting' : {
    topic : new Router([ { name : 'forums' }, { name : 'threads', parent : 'forums' } ]),
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
    topic : new Router([ { name : 'forums', root : true }, { name : 'threads', parent : 'forums' } ]),
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
  'multi-level nesting' : {
    topic : new Router([ { name : 'users' }, { name : 'forums', parent : 'users' },
      { name : 'threads', parent : 'forums' } ]),
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
    topic : new Router([ { name: 'forums', customActions : [
      { name : 'lock', method : 'GET', scope : 'element' },
      { name : 'design', method : 'GET', scope : 'collection' }
    ] } ]),
    'collection action' : function (router) {
      assert.strictEqual(router.path.design_forums_path(), '/forums/design');
    },
    'element action' : function (router) {
      assert.strictEqual(router.path.lock_forum_path(forum), '/forums/5/lock');
    }
  }
}).addBatch({
  'direct id value' : {
    topic : new Router([ { name: 'forums' } ]),
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
    topic : new Router([ { name: 'forums', idField : '_id' } ]),
    'show, delete, or update' : function (router) {
      assert.strictEqual(router.path.forum_path({ _id : 5 }), '/forums/5');
    },
    'edit' : function (router) {
      assert.strictEqual(router.path.edit_forum_path({ _id : 5 }), '/forums/5/edit');
    },
  }
}).export(module);
