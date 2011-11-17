// This may be referenced by the other files, so it should be first.
// You can configure the options externally
exports.config = {
  logger : {
    console: {
      level: 'warning'
    }
  }
};

exports.Controller = require('./lib/controller');
exports.Router = require('./lib/router');
exports.logger = require('./lib/logger');
