/*
 * Backoffice sub-app for quiz management (questions inside quizzes).
 */

var Question = require('../models/question');
var Answer = require('../models/answer');
var _ = require('underscore');

module.exports = questionsApp;

// Subapp setup
// ============

function questionsApp(app, mode) {
  if ('routes' !== mode) {
    // Subapp model checking
    app.use('/admin/quizzes', function checkQuestionModel(req, res, next) {
      var questionId = (req.url.match(/\/questions\/(\d+)\b/) || [])[1];
      if (undefined === questionId)
        return next();

      req.quiz.getQuestions({ where: { 'questions.id': questionId }, include: [Answer], order: 'answers.position' }).success(function(qs) {
        if (qs.length) {
          req.question = qs[0];
          next();
        } else {
          req.flash('error', 'Cette question est introuvable.');
          res.redirect('/admin/quizzes/' + req.quiz.id + '/edit');
        }
      });
    });
  }

  if ('middleware' !== mode) {
    // Namespaced routes (REST resource routes, basically)
    app.namespace('/:quiz_id/questions', function() {
      app.get( '/new',      newQuestion);
      app.post('/',         createQuestion);
      app.get( '/:id/edit', editQuestion);
      app.put( '/:id',      updateQuestion);
      app.del( '/:id',      deleteQuestion);
    });
  }
}

// Quiz resource actions
// =====================

// Action: create question
function createQuestion(req, res) {
  var question = Question.build(req.body.question);
  question.quizId = req.quiz.id;
  req.quiz.getNextQuestionPosition()
    .then(function(nextPos) { question.position = nextPos; })
    .then(function() { return question.save(); })
    .then(function() {
      if (saveAnswers(question, req.body.answers)) {
        req.flash('success', 'La question « ' + question.title + ' » a bien été créée.');
        res.redirect("/admin/quizzes/" + req.quiz.id + "/edit?tab=questions");
      } else {
        res.send(500, 'Ooops');
      }
    }, function() {
      question.errors = _.extend.apply(_, arguments);
      res.render('questions/new', {
        answers: buildAnswers(req.body.answers),
        quiz: req.quiz,
        question: question,
        title: 'Nouvelle question',
        breadcrumbs: buildBreadcrumbs(req.quiz)
      });
    });
}

// Action: delete question
function deleteQuestion(req, res) {
  req.question.destroy().success(function() {
    req.flash('success', "La question « " + req.question.title + " » a bien été supprimée.");
    res.redirect('/admin/quizzes/' + req.quiz.id + '/edit');
  });
}

// Action: edit question
function editQuestion(req, res) {
  res.render('questions/edit', {
    quiz: req.quiz,
    question: req.question,
    answers: buildAnswers(req.question.answers),
    title: req.question.title,
    breadcrumbs: buildBreadcrumbs(req.quiz, req.question)
  });
}

// Action: new question
function newQuestion(req, res) {
  var question = Question.build();
  res.render('questions/new', {
    answers: buildAnswers([]),
    quiz: req.quiz,
    question: question,
    title: 'Nouvelle question',
    breadcrumbs: buildBreadcrumbs(req.quiz)
  });
}

// Action: update question
function updateQuestion(req, res) {
  var question = req.question;
  question.updateAttributes(req.body.question)
    .success(function() {
      if (saveAnswers(question, req.body.answers)) {
        req.flash('success', 'La question « ' + question.title + ' » a bien été mise à jour.');
        res.redirect("/admin/quizzes/" + req.quiz.id + "/edit?tab=questions");
      } else {
        res.send(500, 'Ooops');
      }
    })
    .error(function() {
      question.errors = _.extend.apply(_, arguments);
      console.log('QUESTION ERRORS:', question.errors)
      res.render('questions/edit', {
        answers: buildAnswers(req.body.answers),
        quiz: req.quiz,
        question: question,
        title: question.title,
        breadcrumbs: buildBreadcrumbs(req.quiz, question)
      });
    });
}

// Inlined answers management
// ==========================

var MIN_PROPOSED_ANSWERS = 4;
var MIN_BLANKED_ANSWERS  = 2;

var RE_BLANK = /^\s*$/;

function buildAnswers(existing) {
  var blankAnswers = 0, result = existing.slice();
  while (result.length < MIN_PROPOSED_ANSWERS || blankAnswers < MIN_BLANKED_ANSWERS) {
    result.push(Answer.build());
    ++blankAnswers;
  }

  return result;
}

function saveAnswers(question, paramAnswers) {
  var pos = 1, hasErrors = false;
  paramAnswers.forEach(function(pa) {
    function updateAnswer(answer) {
      // If called by getAnswers
      if (_.isArray(answer))
        answer = answer[0];

      // Dev note: the body params struct passed in apparently has no .hasOwnProperty?!?
      // Cloning it to a plain object works around this.
      answer.setAttributes(_.clone(pa));

      // Empty answers should be ignored/removed
      if (RE_BLANK.test(answer.text)) {
        if (!answer.isNewRecord)
          answer.destroy();
        return;
      }

      // Fields are serialized in document order by the browser, so...
      answer.position = pos++;
      answer.questionId = question.id;
      answer.save().error(function() {
        answer.errors = _.extend.apply(_, arguments);
        hasErrors = true;
      });
    }

    if (pa.id)
      question.getAnswers({ where: { id: pa.id } }).success(updateAnswer);
    else
      updateAnswer(Answer.build());
  });

  return !hasErrors;
}

function buildBreadcrumbs(quiz, question) {
  return [
    { url: '/admin/quizzes', label: 'Quizzes' },
    { url: '/admin/quizzes/' + quiz.id + '/edit', label: quiz.title },
    { label: question ? question.title : 'Nouvelle question' }
  ];
}
