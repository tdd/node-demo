/*
 * Frontoffice sub-app for quiz running.
 */

var passport = require('passport');
// var BasicStrategy = require('passport-http').BasicStrategy;
var Sequelize = require('sequelize');
var Quiz = require('../models/quiz');
// var _ = require('underscore');

module.exports = frontOfficeApp;

// Subapp setup
// ============

function frontOfficeApp(app) {
  // Root access should redirect to the frontoffice subapp
  app.all('/', function(req, res) {
    res.redirect(301, '/front');
  });

  // Subapp authentication
  app.use('/front', passport.authenticate('basic', { session: false }));

  // Subapp-local views
  app.use('/front', function useLocalViews(req, res, next) {
    app.set('views', path.join(__dirname, 'views'));
    next();
  });

  // Namespaced quiz running routes
  app.namespace('/front', function() {
    app.get('/', mainPage);
  });
}

function mainPage(req, res) {
  // FIXME/TODO
  res.send(200, 'COMING SOON!');
}
