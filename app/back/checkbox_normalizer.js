// Hidden/Checkbox serialization of checkboxes, turn these into booleans.
// This is intended for use as a Connect/Express middleware.

var _ = require('underscore');

var RE_FLAGS = /(?:correct|exact|valid|[stv]ed|bled?)$/i;

function normalize(o) {
  _.each(o, function(v, k) {
    if (RE_FLAGS.test(k)) {
      o[k] = normalizeEntry(v);
    } else if (_.isObject(v)) {
      normalize(v);
    }
  });
}

function normalizeEntry(v) {
  return +_.last(_.flatten([v])) > 0;
}

module.exports = function normalizeCheckboxes(req, res, next) {
  normalize(req.query);
  normalize(req.body);
  next();
};
