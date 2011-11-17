var winston = require('winston'),
    config = require('../index').config;

// Load the logger after it's requested so it can be set at configuration time
var logger;
exports.get = function () {
  if (!logger) {
    winston.loggers.add('dispatch', config.logger);
    logger = winston.loggers.get('dispatch');
  }
  return logger;
};
