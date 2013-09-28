/*
 * Frontoffice sub-app for quiz running.
 */

var fs              = require('fs');
var passport        = require('passport');
var path            = require('path');
var TwitterStrategy = require('passport-twitter').Strategy;
var Sequelize       = require('sequelize');
var Quiz            = require('../models/quiz');
var engine          = require('../engine');
var _               = require('underscore');
var io              = require('socket.io');

module.exports = frontOfficeApp;

var OAUTH_CALLBACK_PATH = '/ohai';

// Subapp setup
// ============

function frontOfficeApp(app, mode, server) {
  if ('routes' !== mode) {
    bindWebSockets(server);

    // Subapp-local views
    app.use('/front', function useLocalViews(req, res, next) {
      app.set('views', path.join(__dirname, 'views'));
      next();
    });
  }

  if ('middleware' !== mode) {
    // Root access should redirect to the frontoffice subapp
    app.all('/', function(req, res) {
      res.redirect(301, '/front');
    });

    // Namespaced quiz running routes
    app.namespace('/front', function() {
      app.get('/', mainPage);

      app.get('/auth', passport.authenticate('twitter'));

      app.get(OAUTH_CALLBACK_PATH, passport.authenticate('twitter', {
        successRedirect: '/front',
        failureFlash: true,
        failureRedirect: '/front'
      }));
    });
  }
}

function mainPage(req, res) {
  engine.checkAuth(req, res, function() {
    if (engine.currentQuiz) {
      engine.getUsers(function(users) {
        res.render('index', { user: req.user, engine: engine, users: users });
      });
    } else {
      res.render('index', { user: req.user, engine: engine });
    }
  });
}

// WebSockets manager
// ==================

// This binds a WebSockets layer over the HTTP app and provides the gateway
// between WS traffic and the engine (both ways).

function bindWebSockets(server) {
  var sio = io.listen(server);

  // Quiz init: notify waiting clients ("No active quiz yet…" front screens)
  engine.on('quiz-init', function(quiz) {
    engine.getUsers(function(users) {
      sio.sockets.emit('quiz-init', _.pick(quiz, 'title', 'description', 'level'), users);
    });
  });

  // Quiz join: a new user comes in the engine while a quiz is at init stage.
  engine.on('quiz-join', function(user, playerCountStr) {
    sio.sockets.emit('quiz-join', user, playerCountStr);
  });
}

// Frontoffice authentication setup
// ================================

// Read credentials off a JSON file
// in this file's directory and initialize a Passport Twitter OAuth strategy
// with those.

function readCredentials(cb) {
  fs.readFile(path.join(__dirname, 'credentials.json'), function(err, json) {
    if (err)
      console.warn("Missing frontoffice credentials -> You won't be able to authenticate!");

    var creds = JSON.parse(json || '{}');
    if (creds.consumerKey && creds.consumerSecret)
      console.log("Front credentials loaded");
    else
      console.log("One or more blank front credential -> You won't be able to authenticate!");

    cb(creds);
  });
}

readCredentials(function(creds) {
  passport.use(new TwitterStrategy(
    _.extend(creds, { callbackURL: 'http://192.168.0.45:3000/front' + OAUTH_CALLBACK_PATH }),
    function(token, tokenSecret, profile, done) {
      var user = {
        id: profile.id,
        name: '@' + profile.displayName,
        avatar: (profile.photos[0] || {}).value
      };
      console.log('TWITTER USER: ', user);
      done(null, user);
    }
  ));

  passport.serializeUser(function(user, done) {
    // Everything for now, but when deserialize looks it up in Redis, id only.
    done(null, user);
  });

  passport.deserializeUser(function(user, done) {
    // Nothing for now, but when we look it up in Redis, we'll get the id only.
    done(null, user);
  });
});
