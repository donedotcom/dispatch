// This may be referenced by the other files, so it should be first.
// You can configure the options externally
exports.config = {
  templateCache : true,
  logger : {
    console: {
      level: 'warning'
    }
  }
};

exports.Controller = require('./lib/controller');
exports.Render = require('./lib/render');
exports.Router = require('./lib/router');
exports.logger = require('./lib/logger');
