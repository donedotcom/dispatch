/**
  Done. Render helper
  Copyright (c) 2011 Done. Corporation
*/
var fs = require('fs'),
    path = require('path'),
    jade = require('jade'),
    _ = require('underscore')._,
    config = require('../index').config;

/*
  var render = new Render(opts)
  opts:
    dir : default directory to find views

  render.render([view], opts)
  view (optional)
*/
var Render = module.exports = function (options) {
  var self = this;
  this.directory = options.dir || process.cwd() + '/app/views';
  this.layoutDirectory = options.dir ? path.join(options.dir, '..', 'layouts') : path.join(this.directory, 'layouts');
  this.defaultLayout = 'layout';

  this.templateCache = {};
  this.helperCache = {};

  var helpersDir = path.join(process.cwd(), 'app', 'helpers');
  path.exists(helpersDir, function (exists) {
    if (exists) {
      var files = fs.readdirSync(helpersDir);
      _.each(files, function (file) {
        _.extend(self.helperCache, require(path.join(helpersDir, file)));
      });
    }
  });
};

/**
  Convenience function to find the right filename
  @api private
*/
var _readFirstFile = function (names, callback) {
  var found,
    count = 0;

  _.each(names, function (name) {
    path.exists(name, function (exists) {
      count += 1;
      if (!found) {
        if (exists) {
          found = name;
          fs.readFile(found, callback);
        } else if (count === names.length) {
          callback('no file found among ' + names.join(', '));
        }
      }
    });
  });
};

/**
  Render
  @param options
    view : located in the default directory provided when the object was created.
    layout : the layout for this rendering (defaults to 'layout')
    statusCode : any status code (defaults to 200 OK)
*/

Render.prototype.render = function (req, res, next, options) {
  var view = options.view || req.action,
    viewPath = path.join(this.directory, view),
    layout = options.layout || this.defaultLayout,
    layoutPath = path.join(this.layoutDirectory, layout),
    cache = this.templateCache,
    helperCache = this.helperCache,
    body;

  function withTemplate(template, callback) {
    if (config.templateCache === true && cache[template]) {
      callback(null, cache[template]);
    } else {
      _readFirstFile([template + '.jade', template + '.html.jade'], function (err, data) {
        if (!err) {
          cache[template] = jade.compile(data);
        }
        callback(err, cache[template]);
      });
    }
  }

  function sendBody(body) {
    res.setHeader('Content-Length', body.length);
    res.end(body);
  }

  if (options.statusCode) {
    res.statusCode = options.statusCode;
  }

  if (options.json) {
    body = JSON.stringify(options.json);
    res.setHeader('Content-Type', 'application/json');
    sendBody(body);
  } else {
    // Load helper functions with the request
    options.locals = options.locals || {};
    _.each(_.keys(helperCache), function (fnName) {
      var fn = helperCache[fnName];
      options.locals[fnName] = fn(req);
    });

    withTemplate(viewPath, function (err, view) {
      if (err) {
        sendBody(err);
      } else {
        // Load the view into the body variable so it can be rendered by the layout
        options.locals.body = view(options.locals);
        withTemplate(layoutPath, function (err, layout) {
          if (err) {
            body = err;
          } else {
            body = layout(options.locals);
          }
          sendBody(body);
        })
      }
    });
  }
};
