var Quiz      = require('./models/quiz');
var Question  = require('./models/question');
var Answer    = require('./models/answer');
var redis     = require('redis').createClient();
var _         = require('underscore');
var events    = require('events');
var async     = require('async');

// The quiz running engine (business logic)
// ========================================

var AUTH_PERSIST_KEY  = 'blend-demo:ips-to-users';
var USER_LIST_KEY     = 'blend-demo:users';

var Engine = _.extend(new events.EventEmitter(), {
  // State

  currentQuiz: null,
  currentQuestion: null,
  currentQuestionExpiresAt: 0,
  playerCount: 'Aucun joueur',
  startedAt: 0,

  // Features

  checkAuth: function(req, res, next) {
    var user = req.user;
    var self = this;

    if (user) {
      handleUser(user);
    } else {
      redis.hget(AUTH_PERSIST_KEY, req.ip, handleRedisUser);
    }

    function handleUser(user) {
      var json = JSON.stringify(user);
      async.waterfall([
        function(cb)        { redis.hset(AUTH_PERSIST_KEY, req.ip, json, cb); },
        function(foo, cb)   { redis.zscore(USER_LIST_KEY, json, cb); },
        function(score, cb) { redis.zadd(USER_LIST_KEY, score || Date.now(), json, cb); },
        function(foo, cb)   { redis.zcard(USER_LIST_KEY, cb); },
        function(count, cb) {
          self.playerCount = count <= 0 ? 'Aucun joueur' : (1 == count ? 'Un joueur' : count + ' joueurs');
          if (self.currentQuiz && !self.isRunning())
            self.emit('quiz-join', user, self.playerCount);
          cb();
        },
        next
      ]);
    }

    function handleRedisUser(err, json) {
      if (!json)
        res.redirect(302, '/front/auth');
      else {
        req.user = JSON.parse(json);
        handleUser(req.user);
      }
    }
  },

  getUsers: function getUsers(cb) {
    redis.zrangebyscore(USER_LIST_KEY, 0, +Infinity, function(err, users) {
      cb(_.map(users, JSON.parse));
    });
  },

  initQuiz: function initQuiz(quizId) {
    var self = this;
    self.reset();

    return Quiz.find(quizId).success(function(quiz) {
      self.currentQuiz = quiz;
      self.emit('quiz-init', quiz);
    });
  },

  isRunning: function isRunning() { return !!this.currentQuestion; },

  nextQuestion: function nextQuestion() {
    if (0 === this.startedAt)
      return;

    var opts = { where: { visible: true }, order: 'position', limit: 1, include: [Answer] };
    if (this.currentQuestion)
      opts.where.position = 'ge ' + this.currentQuestion.position;
    var self = this;

    return this.currentQuiz.getQuestions(opts).success(function(qs) {
      var question = qs[0];
      if (question) {
        self.currentQuestion = question;
        self.currentQuestionExpiresAt = Date.now() + question.duration * 1000;
      } else {
        self.wrapUp();
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
});

module.exports = Engine;
