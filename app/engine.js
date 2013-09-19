var Quiz      = require('./models/quiz');
var Question  = require('./models/question');
var Answer    = require('./models/answer');
var _         = require('underscore');

// The quiz running engine (business logic)
// ========================================

var Engine = {
  // State
  currentQuiz: null,
  currentQuestion: null,
  currentQuestionExpiresAt: 0,
  startedAt: 0,

  // Features
  initQuiz: function initQuiz(quizId) {
    var self = this;
    self.reset();

    return Quiz.find(quizId).success(function(quiz) {
      self.currentQuiz = quiz;
    });
  },

  isRunning: function isRunning() { return this.startedAt > 0; },

  nextQuestion: function nextQuestion() {
    if (!this.isRunning())
      return;

    var opts = { where: { visible: true }, order: 'position', limit: 1 };
    if (this.currentQuestion)
      opts.where.position = 'ge ' + this.currentQuestion.position;
    return this.currentQuiz.getQuestions(opts).success(function(qs) {
      var question = qs[0];
      if (question) {
        this.currentQuestion = question;
        this.currentQuestionExpiresAt = Date.now() + question.duration * 1000;
      } else {
        this.wrapUp();
      }
    });
  },

  reset: function reset() {
    this.currentQuiz = this.currentQuestion = null;
    this.currentQuestionExpiresAt = this.startedAt = 0;
  },

  start: function start() {
    this.startedAt = Date.now();
    return this.nextQuestion();
  },

  wrapUp: function wrapUp() {
    // FIXME: wrap up!
  }
};

module.exports = Engine;
