/*
 * Backoffice sub-app for quiz management (quizzes and questions).
 */

var fs = require('fs');
var passport = require('passport');
var path = require('path');
var BasicStrategy = require('passport-http').BasicStrategy;
var Quiz = require('../models/quiz');

module.exports = backOfficeApp;

// Subapp setup
// ============

function backOfficeApp(app) {
  // Subapp authentication (using a previously registered HTTP Basic strategy)
  app.use('/admin', passport.authenticate('basic', { session: false }));

  // Subapp-local views
  app.use('/admin', function useLocalViews(req, res, next) {
    app.set('views', path.join(__dirname, 'views'));
    next();
  });
  // Namespaced routes (REST resource routes, basically)
  app.namespace('/admin', function() {
    app.get( '/',             listQuizzes);
    app.get( '/quizzes/new',  newQuiz);
    app.post('/quizzes',      createQuiz);
    app.get( '/quizz/:id',    editQuiz);
    app.put( '/quizz/:id',    updateQuiz);
    app.del( '/quizz/:id',    deleteQuiz);
  });
}

// Quiz resource actions
// =====================

// Action: create quiz
function createQuiz(req, res) {
  // req.params.quiz (obj)
  res.send(201, 'Created coming soon!');
}

// Action: delete quiz
function deleteQuiz(req, res) {
  // req.params.id
  res.send(204, "Deletion coming soon!");
}

// Action: edit quiz
function editQuiz(req, res) {
  // req.params.id
  res.send("COMING SOON");
}

// Action: quizz listing
function listQuizzes(req, res) {
  Quiz.findAll().success(function(quizzes) {
    res.render('index', { quizzes: quizzes });
  });
}

// Action: new quiz
function newQuiz(req, res) {
  res.send("COMING SOON");
}

// Action: update quiz
function updateQuiz(req, res) {
  // req.params.id
  res.redirect(req.url);
}

// Backoffice authentication setup
// ===============================

// Read credentials off a JSON file
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
