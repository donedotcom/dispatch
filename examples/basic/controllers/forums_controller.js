/**
  Example Forums Controller, for displaying your own Forums
  Copyright (c) 2011 Done. Corporation
*/
var Controller = require('../../lib/controller'),
    ForumsController = Controller.extend();

ForumsController.before('all', '_loadUser');

// Fake a 'database' for the example
var ForumsDb = [
  { name : 'Forum 1' },
  { name : 'Forum 2 '}
];

ForumsController.prototype.index = function (req, res, next) {
  var locals = {
    forums : ForumsDb
  };
  
  if (req.method === 'json') {
    res.render({ json : locals })
  } else {
    res.render({ locals : locals });
  }
};

// Example custom action
ForumsController.prototype.admin = function (req, res, next) {
  res.render();
}

ForumsController.prototype._loadUser = function (req, res, next) {
  // Load user here
  next();
}

// Forums is avalailable at the root (root : true)
module.exports = new ForumsController({ name : 'Forums', root : true,
  customActions: [
    { name : 'admin', method : 'GET', scope : 'collection' }
  ]
});
