//
// Spec helpers
//
var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    _ = require('underscore')._;

function FakeResource(params) {
  EventEmitter.call(this);
  _.extend(this, params);
}
util.inherits(FakeResource, EventEmitter);

exports.resource = function resource(params) {
  return new FakeResource(params);
}
