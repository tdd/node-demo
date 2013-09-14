/*
 * Backoffice sub-app for quiz management (quizzes and questions).
 */

var fs = require('fs');
var passport = require('passport');
var path = require('path');
var BasicStrategy = require('passport-http').BasicStrategy;
var Quiz = require('../models/quiz');
var _ = require('underscore');

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

  // Subapp model checking
  app.use('/admin/quizzes', function checkQuizModal(req, res, next) {
    var quizId = (req.url.match(/^\/(\d+)\b/) || [])[1];
    if (undefined === quizId)
      return next();

    Quiz.find(quizId).success(function(quiz) {
      if (quiz) {
        req.quiz = quiz;
        next();
      } else {
        req.flash('error', 'Ce quiz est introuvable.');
        res.redirect('/admin');
      }
    });
  });

  // Namespaced routes (REST resource routes, basically)
  app.namespace('/admin', function() {
    app.get( '/',                 listQuizzes);
    app.get( '/quizzes/new',      newQuiz);
    app.post('/quizzes',          createQuiz);
    app.get( '/quizzes/:id/edit', editQuiz);
    app.put( '/quizzes/:id',      updateQuiz);
    app.del( '/quizzes/:id',      deleteQuiz);
  });
}

// Quiz resource actions
// =====================

// Action: create quiz
function createQuiz(req, res) {
  var quiz = Quiz.build(req.body.quiz);
  quiz.save()
    .success(function() {
      req.flash('success', 'Le quiz « ' + quiz.title + ' » a bien été créé.');
      res.redirect('/admin/quizzes/' + quiz.id + '/edit');
    })
    .error(function() {
      quiz.errors = _.extend.apply(_, arguments);
      res.render('new', { quiz: quiz, title: 'Nouveau quiz' });
    });
}

// Action: delete quiz
function deleteQuiz(req, res) {
  req.quiz.destroy().success(function() {
    req.flash('success', "Le quiz « " + req.quiz.title + " » a bien été supprimé.");
    res.redirect('/admin');
  });
}

// Action: edit quiz
function editQuiz(req, res) {
  res.render('edit', { quiz: req.quiz, breadcrumbs: buildBreadcrumbs(req.quiz) });
}

// Action: quizz listing
function listQuizzes(req, res) {
  Quiz.findAll().success(function(quizzes) {
    res.render('index', { quizzes: quizzes });
  });
}

// Action: new quiz
function newQuiz(req, res) {
  var quiz = Quiz.build();
  res.render('new', { quiz: quiz, title: 'Nouveau quiz' });
}

// Action: update quiz
function updateQuiz(req, res) {
  var quiz = req.quiz;
  quiz.updateAttributes(req.body.quiz)
  .success(function() {
    req.flash('success', 'Le quiz « ' + quiz.title + ' » a bien été mis à jour.');
    res.redirect("/admin/quizzes/" + quiz.id + "/edit");
  })
  .error(function() {
    quiz.errors = _.extend.apply(_, arguments);
    res.render('edit', { quiz: quiz, breadcrumbs: buildBreadcrumbs(quiz) });
  });
}

function buildBreadcrumbs(quiz) {
  return [
    { url: '/admin', label: 'Quizzes' },
    { label: quiz.title }
  ];
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
