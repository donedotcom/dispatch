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
    _ = require('underscore')._,
    async = require('async'),
    config = require('../index').config,
    logger = require('./logger');

var ViewExtension = '.jade';       // Extension of file on disk that can become a view
var _ViewCompileFn = jade.compile;  // Converts a view to a template

// ---------------------------------------------------------------------------
// var render = new Render(opts)
// opts:
//   dir : default directory to find view files
//
// render.render([view], opts)
// view (optional)
// ---------------------------------------------------------------------------
var Render = module.exports = function (options) {
  var self = this;
  this.directory = options.dir || process.cwd() + '/app/views';
  this.layoutDirectory = options.dir ? path.join(options.dir, '..', 'layouts') : path.join(this.directory, 'layouts');
  this.defaultLayout = 'layout';

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
      options = options || {};

  options.locals = options.locals || {};
  var helperFunctions = {
    include : function (relativeFilename, partialOptions) {
      // Load from cache (synchronously) and render with local options
      var allOptions = _.extend({}, options, partialOptions),
          includeFilename = path.join(self.directory, relativeFilename),
          fn = self._loadTemplateWithCache(includeFilename);
      return fn(allOptions.locals);
    }
  };
  _.extend(options.locals, helperFunctions);

  self._loadTemplateWithCache(path.join(self.directory, filePath), function (err, template) {
    if (err) {
      return callback(err);
    }
    var body = template(options.locals);

    if (options.layout && options.layout !== 'none') {
      self._loadTemplateWithCache(path.join(self.layoutDirectory, options.layout), function (err, layoutTemplate) {
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
  var names = [];

  if (fileName.match(new RegExp(ViewExtension + '$'))) {
    // Has .jade extension
    names.push(fileName);
  } else if (fileName.match(/\.html$/)) {
    // has HTML extension
    names.push(fileName + ViewExtension);
  } else {
    // Has unknown extension -- add both html and view extensions
    names.push(fileName + '.html' + ViewExtension);
    names.push(fileName + ViewExtension);
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
Render.prototype._readFile = function (fileName, callback) {
  var found,
      names = this._fileNames(fileName);

  if (callback) {
    // Async version
    async.forEach(names, function (fileName, callback) {
      path.exists(fileName, function (exists) {
        if (!found && exists) { found = fileName; }
        callback();
      });
    }, function (err) {
      if (found) {
        fs.readFile(found, function (err, data) {
          callback(err, data && data.toString());
        });
      } else {
        callback('no file found ' + names.join(', '));
      }
    });
  } else {
  // Sync version
    found = _.detect(names, function (fileName) { return path.existsSync(fileName); });
    if (found) {
      return fs.readFileSync(found);
    } else {
      return 'no file found ' + names.join(', ');
    }
  }
};

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
      self._readFile(filePath, function (err, view) {
        if (!err) {
          self.templateCache[filePath] = _ViewCompileFn(view);
        }
        callback(err, self.templateCache[filePath]);
      });
    } else {
      callback(null, self.templateCache[filePath]);
    }
  } else {
    if (!self.templateCache[filePath]) {
      var fileData = self._readFile(filePath);
      try {
        self.templateCache[filePath] = _ViewCompileFn(fileData);
      } catch (err) {
        return err;
      }
    }
    return self.templateCache[filePath];
  }
};

