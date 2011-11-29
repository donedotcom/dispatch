// -------------------------------------------------------------------------79
// Dispatch Render class
//
// Terminology:
//   file     : a file on disk; file names MAY include template extension (file.html.jade)
//   view     : the data of a file on disk representing a view; view names do
//              not include template extension (file.html)
//   template : compiled view that can be executed as template(options) to render output
//   output   : rendered output
//
// Copyright (c) 2011 Done. Corporation
// ---------------------------------------------------------------------------
var fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    ejs = require('ejs'),
    _ = require('underscore')._,
    async = require('async'),
    config = require('../index').config,
    logger = require('./logger');

var ViewCompileFns = {
  '.jade' : jade.compile,
  '.ejs' : ejs.compile
};

// ---------------------------------------------------------------------------
// var render = new Render(opts)
// opts:
//   dir : default directory to find view files
//   defaultTemplate : default template extension (.jade by default)
//
// render.render([view], opts)
// view (optional)
// ---------------------------------------------------------------------------
var Render = module.exports = function (options) {
  var self = this;
  this.directory = options.dir || process.cwd() + '/app/views';
  this.layoutDirectory = options.dir ? path.join(options.dir, '..', 'layouts') : path.join(this.directory, 'layouts');
  this.defaultLayout = 'layout';
  this.defaultTemplate = options.defaultTemplate || '.jade';

  this.templateCache = {};
  this.requestHelpers = {};

  var helpersDir = path.join(process.cwd(), 'app', 'helpers');
  path.exists(helpersDir, function (exists) {
    if (exists) {
      var files = fs.readdirSync(helpersDir);
      _.each(files, function (file) {
        _.extend(self.requestHelpers, require(path.join(helpersDir, file)));
      });
    }
  });
};

//
// Render to a string
// @param filePath {String} File name, with path relative to the Render directory
// @param options {Object}
//   options.layout layout with path relative to the layout directory, or 'none'
//   options.locals local variables and helper functions for rendering
// @param callback {Function} (err, renderedView)
//
Render.prototype.renderToString = function (filePath, options, callback) {
  var self = this,
      options = options || {},
      fullPath = filePath.indexOf('/') === 0 ? filePath : path.join(self.directory, filePath),
      layoutPath = options.layout && options.layout.indexOf('/') === 0 ? options.layout : path.join(self.layoutDirectory, options.layout);

  options.locals = options.locals || {};
  var helperFunctions = {
    include : function (relativeFilename, partialOptions) {
      // Load from cache (synchronously) and render with local options
      var allOptions = _.extend({}, options, partialOptions),
          includeFilename = path.join(path.dirname(fullPath), relativeFilename),
          fn = self._loadTemplateWithCache(includeFilename);
      return fn(allOptions.locals);
    }
  };
  _.extend(options.locals, helperFunctions);

  self._loadTemplateWithCache(fullPath, function (err, template) {
    if (err) {
      return callback(err);
    }
    var body = template(options.locals);

    if (options.layout && options.layout !== 'none') {
      self._loadTemplateWithCache(layoutPath, function (err, layoutTemplate) {
        if (err) {
          return callback(err);
        }
        options.locals.body = body;
        callback(null, layoutTemplate(options.locals));
      });
    } else {
      callback(null, body);
    }
  });
};

//
// Render
// @param options
//   view : located in the default directory provided when the object was created.
//   layout : the layout for this rendering (defaults to 'layout')
//   statusCode : any status code (defaults to 200 OK)
//
Render.prototype.render = function (req, res, next, options) {
  var self = this,
      viewName = options.view || req.action,
      body;

  function _sendBody(body) {
    res.setHeader('Content-Length', body.length);
    res.end(body);
  }

  if (options.statusCode) {
    res.statusCode = options.statusCode;
  }

  if (options.json) {
    // Do not invoke full template rendering
    body = JSON.stringify(options.json);
    res.setHeader('Content-Type', 'application/json');
    _sendBody(body);
  } else if (options.head) {
    // Do not invoke full template rendering to send only the head status
    res.statusCode = options.head;
    _sendBody('');
  } else {
    // Full template rendering

    // Add request-dependent helper functions
    options.locals = options.locals || {};
    _.each(_.keys(self.requestHelpers), function (fnName) {
      options.locals[fnName] = self.requestHelpers[fnName](req);
    });

    options.layout = options.layout || self.defaultLayout;

    self.renderToString(viewName, options, function (err, output) {
      if (err) {
        logger.get().error(err);
        if (next) { next(err); }
      } else {
        _sendBody(output);
      }
    })
  }
};

// ---------------------------------------------------------------------------
// Private convenience / utility functions
// ---------------------------------------------------------------------------

Render.prototype._fileNames = function (fileName) {
  var names = [],
      templateType = this._fileTemplateType(fileName);

  if (templateType && ViewCompileFns[templateType]) {
    // Has a template extension (eg .jade)
    names.push(fileName);
  } else if (fileName.match(/\.html$/)) {
    // has HTML extension
    names.push(fileName + this.defaultTemplate);
  } else {
    // Has unknown extension -- add both html and view extensions
    names.push(fileName + '.html' + this.defaultTemplate);
    names.push(fileName + this.defaultTemplate);
  }
  return names;
};

//
// Convenience function to find the right fileName.
//
// 'file' --> file.jade, file.html.jade
// 'file.jade' --> file.jade
//
// If you pass callback, this is asynchronous; if you don't it is synchronous.
//
// @api private
//
Render.prototype._compileFile = function (fileName, callback) {
  var self = this,
      names = this._fileNames(fileName),
      found,
      compileFn;

  if (callback) {
    // Async version
    async.forEach(names, function (fileName, callback) {
      path.exists(fileName, function (exists) {
        if (!found && exists) { found = fileName; }
        callback();
      });
    }, function (err) {
      if (found) {
        compileFn = ViewCompileFns[self._fileTemplateType(found)];
        fs.readFile(found, function (err, data) {
          if (!err && data && compileFn) {
            callback(null, compileFn(data.toString()));
          } else {
            callback(err || 'no template type for ' + found);
          }
        });
      } else {
        callback('no file found ' + names.join(', '));
      }
    });
  } else {
  // Sync version
    found = _.detect(names, function (fileName) { return path.existsSync(fileName); });
    if (found) {
      compileFn = ViewCompileFns[self._fileTemplateType(found)];
      if (compileFn) {
        return compileFn(fs.readFileSync(found).toString());
      } else {
        return 'no template type for ' + found;
      }
    } else {
      return 'no file found ' + names.join(', ');
    }
  }
};

// Return the extension that can be used in the ViewCompileFns
Render.prototype._fileTemplateType = function (filename) {
  var match = filename.match(/(\.\w+$)/);
  return match && match[1];
}

//
// Load the template for fileName from the cache if possible, or from the filesystem
// @param filePath {String} Full path + fileName
// @param callback {Function} (optional) (err, template)
//   If no callback is supplied, returns template synchronously and return it
Render.prototype._loadTemplateWithCache = function (filePath, callback) {
  var self = this;

  if (callback) {
    // async version
    if (!self.templateCache[filePath]) {
      self._compileFile(filePath, function (err, template) {
        if (!err) {
          self.templateCache[filePath] = template;
        }
        callback(err, self.templateCache[filePath]);
      });
    } else {
      callback(null, self.templateCache[filePath]);
    }
  } else {
    if (!self.templateCache[filePath]) {
      self.templateCache[filePath] = self._compileFile(filePath);
    }
    return self.templateCache[filePath];
  }
};

