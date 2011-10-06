var winston = require('winston');

winston.loggers.add('dispatch', {
	console: {
		level: 'warning'
	}
});

module.exports = winston.loggers.get('dispatch');