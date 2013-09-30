/*
 * Backoffice sub-app for quiz management (quizzes and questions).
 */

var fs = require('fs');
var passport = require('passport');
var path = require('path');
var BasicStrategy = require('passport-http').BasicStrategy;
var Sequelize = require('sequelize');
var Quiz = require('../models/quiz');
var Question = require('../models/question');
var checkboxNormalizer = require('./checkbox_normalizer');
var engine = require('../engine');
var _ = require('underscore');
var localIP = require('../client/local_ip').localIP;

module.exports = backOfficeApp;

// Subapp setup
// ============

function backOfficeApp(app, mode) {
  if ('routes' !== mode) {
    app.use('/admin', checkboxNormalizer);

    // Subapp authentication (using a previously registered HTTP Basic strategy)
    app.use('/admin', passport.authenticate('basic', { session: false }));

    // Subapp-local views
    app.use('/admin', function useLocalViews(req, res, next) {
      app.set('views', path.join(__dirname, 'views'));
      app.locals.localIP = localIP;
      next();
    });

    // Subapp model checking
    app.use('/admin/quizzes', function checkQuizModel(req, res, next) {
      var quizId = (req.url.match(/^\/(\d+)\b/) || [])[1];
      if (undefined === quizId)
        return next();

      Quiz.find(quizId).success(function(quiz) {
        if (quiz) {
          req.quiz = quiz;
          next();
        } else {
          req.flash('error', 'Ce quiz est introuvable.');
          res.redirect('/admin/quizzes');
        }
      });
    });
    require('./questions')(app, 'middleware');
  }

  if ('middleware' !== mode) {
    // Root access should redirect to the backoffice main page
    app.all('/admin', function(req, res) {
      res.redirect(301, '/admin/quizzes');
    });

    // Namespaced routes (REST resource routes)
    app.namespace('/admin/quizzes', function() {
      app.get( '/',             listQuizzes);
      app.get( '/new',          newQuiz);
      app.post('/',             createQuiz);
      app.get( '/:id/edit',     editQuiz);
      app.put( '/:id',          updateQuiz);
      app.put( '/:id/reorder',  reorderQuiz);
      app.put( '/:id/init',     initQuiz);
      app.put( '/:id/start',    startQuiz);
      app.put( '/:id/next',     nextQuestion);
      app.del( '/:id',          deleteQuiz);
      app.get( '/scoreboard',   scoreboard);

      require('./questions')(app, 'routes');
    });
  }
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
      res.render('new', { quiz: quiz, title: 'Nouveau quiz', breadcrumbs: buildBreadcrumbs() });
    });
}

// Action: delete quiz
function deleteQuiz(req, res) {
  req.quiz.destroy().success(function() {
    req.flash('success', "Le quiz « " + req.quiz.title + " » a bien été supprimé.");
    res.redirect('/admin/quizzes');
  });
}

// Action: edit quiz
function editQuiz(req, res) {
  req.quiz.getQuestions({ order: 'position' }).success(function(questions) {
    res.render('edit', {
      quiz: req.quiz,
      questions: questions,
      title: req.quiz.title,
      breadcrumbs: buildBreadcrumbs(req.quiz)
    });
  });
}

// Action: init quiz
function initQuiz(req, res) {
  engine.initQuiz(req.quiz).then(function() {
    req.flash('success', "Le quiz « " + req.quiz.title + " » est désormais actif.");
    res.redirect('/admin/quizzes');
  });
}

// Action: quizz listing
function listQuizzes(req, res) {
  Quiz.findAll().success(function(quizzes) {
    Quiz.daoFactoryManager.sequelize.query(
      'SELECT quizId AS id, COUNT(id) AS questions FROM questions GROUP BY 1',
      null, { raw: true }
    ).success(function(rows) {
      counters = _.inject(rows, function(acc, row) {
        acc[row.id] = row.questions;
        return acc;
      }, {});

      res.render('index', { engine: engine, quizzes: quizzes, counters: counters });
    });
  });
}

// Action: next question (Ajax)
function nextQuestion(req, res) {
  engine.nextQuestion().then(function() {
    res.send(200, 'Next question');
  });
}

// Action: new quiz
function newQuiz(req, res) {
  var quiz = Quiz.build();
  res.render('new', { quiz: quiz, title: 'Nouveau quiz', breadcrumbs: buildBreadcrumbs() });
}

// Action: reorder quiz
function reorderQuiz(req, res) {
  var updateChain = new Sequelize.Utils.QueryChainer();
  req.body.ids.forEach(function(id, index) {
    updateChain.add(Question.QueryInterface.bulkUpdate(
      Question.tableName,               // QueryInterface is shared and requires table names
      { position: index + 1 },          // Attributes to change
      { quizId: req.quiz.id, id: id }   // WHERE conditions. quizId added as a safeguard.
    ));
  });
  updateChain.run().success(function() {
    res.send(204, 'Order persisted.');
  }).error(function(errors) {
    res.json(500, errors);
  });
}

// Action: score board
function scoreboard(req, res) {
  engine.getLatestScoreboard(function(err, scoreboard) {
    if (err) throw err;
    res.render('scoreboard', {
      board: scoreboard,
      title: 'Derniers scores',
      breadcrumbs: buildBreadcrumbs('Derniers scores')
    });
  });
}

// Action: start quiz
function startQuiz(req, res) {
  engine.start().then(function() {
    if (req.xhr) {
      res.send(200, 'Started');
    } else {
      req.flash('success', "Le quiz « " + req.quiz.title + " » vient de démarrer.");
      res.redirect('/admin/quizzes');
    }
  });
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
    res.render('edit', {
      quiz: quiz,
      title: quiz.title,
      breadcrumbs: buildBreadcrumbs(quiz)
    });
  });
}

function buildBreadcrumbs(quiz) {
  return [
    { url: '/admin/quizzes', label: 'Quizzes' },
    { label: quiz ? quiz.title || quiz : 'Nouveau quiz' }
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
