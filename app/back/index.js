/*
 * Backoffice sub-app for quiz management (quizzes and questions).
 */

var fs = require('fs');
var passport = require('passport');
var path = require('path');
var BasicStrategy = require('passport-http').BasicStrategy;

module.exports = backOfficeApp;

function backOfficeApp(app) {
  // Subapp authentication (using a previously registered HTTP Basic strategy)
  app.use('/admin', passport.authenticate('basic', { session: false }));

  // Subapp-local views
  app.use('/admin', function useLocalViews(req, res, next) {
    app.set('views', path.join(__dirname, 'views'));
    next();
  });
  // Namespaced routes
  app.namespace('/admin', function() {
    app.get('/', quizListing);
  });
}

function quizListing(req, res) {
  res.render('index');
}

// Backoffice authentication setup: read credentials off a JSON file
// in this file's directory and initialize a Passport HTTP Basic strategy
// with those.

function readCredentials(cb) {
  fs.readFile(path.join(__dirname, 'credentials.json'), function(err, json) {
    if (err)
      console.warn("Missing backoffice credentials -> You won't be able to authenticate!");

    var creds = JSON.parse(json || '{}');
    if (creds.user && creds.password)
      console.log("Credentials loaded");
    else
      console.log("One or more blank credential -> You won't be able to authenticate!");

    cb(creds.user, creds.password);
  });
}

readCredentials(function(user, password) {
  passport.use(new BasicStrategy(
    function(u, p, done) {
      done(null, u === user && p === password ? 'Da Boss' : false);
    }
  ));
});
