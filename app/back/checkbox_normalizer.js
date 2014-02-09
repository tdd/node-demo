// Serialized checkbox normalizer
// ==============================

// Hidden/Checkbox serialization of checkboxes, turn these into booleans.
// This is intended for use as a Connect/Express middleware.

var _ = require('underscore');

// Any field whose name matches this will be assumed to be a checkbox, so
// we'll normalize the matching Array, if any, into a `Boolean` (see
// `normalizeEntry`).
var RE_FLAGS = /(?:correct|exact|valid|[stv]ed|bled?)$/i;

// A recursive normalization function for HTTP params, coming either from
// the query string or request body.  Recursive for complex param structures
// (nested objects, etc.).
function normalize(o) {
  _.each(o, function(v, k) {
    if (RE_FLAGS.test(k)) {
      o[k] = normalizeEntry(v);
    } else if (_.isObject(v)) {
      normalize(v);
    }
  });
}

// Turns a single param, or Array param, into a `Boolean`, which is
// true if and only if at least one obtained value is a number greater than 0.
// This assumes checkboxes have numerical values with `0` meaning false and
// others (usually `1`) meaning true.
function normalizeEntry(v) {
  return +_.last(_.flatten([v])) > 0;
}

// This is our middleware function proper.  This operates on the query string params
// (`query`) *and* on the request `body` (used for form POSTs, etc.).
module.exports = function normalizeCheckboxes(req, res, next) {
  normalize(req.query);
  normalize(req.body);
  next();
};
