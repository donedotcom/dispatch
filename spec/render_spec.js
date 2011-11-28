// -------------------------------------------------------------------------79
// Dispatch Render Specification
// ---------------------------------------------------------------------------
var assert = require('assert'),
    vows = require('vows'),
    Render = require('../lib/render'),
    _ = require('underscore')._;

var render = new Render({ dir : __dirname + '/fixtures/views' });

// ---------------------------------------------------------------------------
// Template tests
// ---------------------------------------------------------------------------
vows.describe('Render').addBatch({
  'basic template with extension' : {
    topic : function () {
      var callback = this.callback;
      render.renderToString('basic.html.jade', { locals : { name : 'elvis' } }, function (err, output) {
        callback(err, output);
      });
    },
    'renders data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
    'cached data' : {
      topic : function () {
        render.renderToString('basic.html.jade', { locals : { name : 'madonna' } }, this.callback);
      },
      'renders data' : function (output) {
        assert.ok(output.match(/madonna/), "Did not match: " + output);
      }
    },
  },
  'basic template without extension' : {
    topic : function () {
      render.renderToString('basic.html', { locals : { name : 'elvis' } }, this.callback);
    },
    'renders data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
  },
  'template include' : {
    topic : function () {
      render.renderToString('include_parent.html',
        { locals : { firstName : 'elvis', lastName : 'presley'} },
        this.callback);
    },
    'renders parent data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
    'renders child data' : function (output) {
      assert.ok(output.match(/presley/), "Did not match: " + output);
    }
  },
  'template layout' : {
    topic : function () {
      render.renderToString('basic.html', {
        layout : 'layout.html',
        locals : { title : 'musicians', name : 'elvis' }
      }, this.callback);
    },
    'renders layout data' : function (output) {
      assert.ok(output.match(/musicians/), "Did not match: " + output);
    },
    'renders body data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    }
  },
  'template layout and include' : {
    topic : function () {
      render.renderToString('include_parent.html', {
        layout : 'layout.html',
        locals : { title : 'musicians', firstName : 'elvis', lastName: 'presley' }
      }, this.callback);
    },
    'renders layout data' : function (output) {
      assert.ok(output.match(/musicians/), "Did not match: " + output);
    },
    'renders parent data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
    'renders child data' : function (output) {
      assert.ok(output.match(/presley/), "Did not match: " + output);
    }
  },

// ---------------------------------------------------------------------------
// Jade-specific tests
// ---------------------------------------------------------------------------
}).addBatch({
  'Jade block rendering test' : {
    topic : function () {
      render.renderToString('block.html', {
        layout : 'layout_with_block.html',
        locals : { name : 'elvis' }
      }, this.callback);
    },
    'renders layout data with block' : function (output) {
      assert.ok(output.match(/musicians/), "Did not match: " + output);
    },
    'renders body data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    }
  }

// ---------------------------------------------------------------------------
// Render with request tests
// ---------------------------------------------------------------------------
}).addBatch({
  // TODO
  // Render JSON (without status code)
  // Render with status code (JSON, non-JSON)
  // Render with layout and includes
}).export(module);
