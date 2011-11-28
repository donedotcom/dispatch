/**
  Example Threads Controller, for displaying threads within Threads
  Copyright (c) 2011 Done. Corporation
*/
var Controller = require('../../lib/controller'),
    ThreadsController = Controller.extend();

ThreadsController.before('all', '_loadUser');

// Fake a 'database' for the example
var ThreadsDb = [
  { name : 'Thread 1' },
  { name : 'Thread 2' },
  { name : 'Thread 3' },
];

ThreadsController.prototype.index = function (req, res, next) {
  var locals = {
    threads : ThreadsDb
  };
  
  if (req.method === 'json') {
    res.render({ json : locals })
  } else {
    res.render({ locals : locals });
  }
};

ThreadsController.prototype.show = function (req, res, next) {
  var thread = ThreadsDb[req.id];
  
  if (thread) {
    if (req.method === 'json') {
      res.render({ json : thread });
    } else {
      res.render({ locals : { thread : thread } });
    }
  } else {
    throw 'Need to make a simple res.render({ status : 404 }) or res.head("404")';
  }
};

// Thread is a child of Forums
module.exports = new ThreadsController({ name : 'threads', parent : 'forums' });
