// Isomorphic helper: local IP
// ===========================

// Just a core service that provides the local IP for the current
// machine, trying for external (non-loopback) IPv4 addresses first.

var os = require('os');
var _  = require('underscore');

var localIPv4 = _.chain(os.networkInterfaces()).values().flatten()
  .findWhere({ family: 'IPv4', internal: false }).value();
localIPv4 = localIPv4 ? localIPv4.address : '127.0.0.1';

exports.localIP = localIPv4;
