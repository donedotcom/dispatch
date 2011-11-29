// -------------------------------------------------------------------------79
// Dispatch Render Specification
// ---------------------------------------------------------------------------
var assert = require('assert'),
    vows = require('vows'),
    path = require('path'),
    Render = require('../lib/render'),
    _ = require('underscore')._;

var render = new Render({ dir : __dirname + '/fixtures/views' });
var renderEjs = new Render({ dir : __dirname + '/fixtures/views', defaultTemplate : '.ejs' });

// ---------------------------------------------------------------------------
// Template tests (Jade)
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
  'template with absolute pathname' : {
    topic : function () {
      var callback = this.callback;
      render.renderToString(path.join(__dirname, 'fixtures', 'views', 'basic.html.jade'), 
        { locals : { name : 'madonna' } }, this.callback);
    },
    'renders data' : function (output) {
      assert.ok(output.match(/madonna/), "Did not match: " + output);
    }
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
  'ejs template in jade default renderer' : {
    topic : function () {
      render.renderToString('basic_ejs.html.ejs', {
        locals : { name : 'elvis' }
      }, this.callback);
    },
    'renders body data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    }
  }

// ---------------------------------------------------------------------------
// Template tests (EJS)
// ---------------------------------------------------------------------------
}).addBatch({
  'basic ejs template with extension' : {
    topic : function () {
      var callback = this.callback;
      renderEjs.renderToString('basic_ejs.html.ejs', { locals : { name : 'elvis' } }, function (err, output) {
        callback(err, output);
      });
    },
    'renders data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
    'cached data' : {
      topic : function () {
        renderEjs.renderToString('basic_ejs.html.ejs', { locals : { name : 'madonna' } }, this.callback);
      },
      'renders data' : function (output) {
        assert.ok(output.match(/madonna/), "Did not match: " + output);
      }
    },
  },
  'basic ejs template without extension' : {
    topic : function () {
      renderEjs.renderToString('basic_ejs.html', { locals : { name : 'elvis' } }, this.callback);
    },
    'renders data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    },
  },
  'ejs template include' : {
    topic : function () {
      renderEjs.renderToString('include_parent_ejs.html',
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
  'ejs template layout' : {
    topic : function () {
      renderEjs.renderToString('basic_ejs.html', {
        layout : 'layout_ejs.html',
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
  'ejs template layout and include' : {
    topic : function () {
      renderEjs.renderToString('include_parent_ejs.html', {
        layout : 'layout_ejs.html',
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
  'jade template in ejs default renderer' : {
    topic : function () {
      render.renderToString('basic.html.jade', {
        locals : { name : 'elvis' }
      }, this.callback);
    },
    'renders body data' : function (output) {
      assert.ok(output.match(/elvis/), "Did not match: " + output);
    }
  }
  

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
