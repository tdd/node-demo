var Quiz      = require('./models/quiz');
var Question  = require('./models/question');
var Answer    = require('./models/answer');
var redis     = require('redis').createClient();
var _         = require('underscore');
var events    = require('events');
var async     = require('async');
var colors    = require('colors');
var moment    = require('moment');

// The quiz running engine (business logic)
// ========================================

var AUTH_PERSIST_KEY  = 'blend-demo:ips-to-users';
var CUR_QUESTION_KEY  = 'blend-demo:current-question';
var USER_LIST_KEY     = 'blend-demo:users';

var Engine = _.extend(new events.EventEmitter(), {
  // State

  currentQuiz: null,
  currentQuestion: null,
  currentQuestionExpiresAt: 0,
  currentQuestionTimer: null,
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
      var json = JSON.stringify(user), origScore;
      async.waterfall([
        function(cb)        { redis.hset(AUTH_PERSIST_KEY, req.ip, json, cb); },
        function(foo, cb)   { redis.zscore(USER_LIST_KEY, json, cb); },
        function(score, cb) { redis.zadd(USER_LIST_KEY, (origScore = score) || Date.now(), json, cb); },
        function(foo, cb)   { redis.zcard(USER_LIST_KEY, cb); },
        function(count, cb) {
          self.playerCount = count <= 0 ? 'Aucun joueur' : (1 == count ? 'Un joueur' : count + ' joueurs');
          if (self.currentQuiz && !self.isRunning() && !origScore)
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
      log('info', 'Quiz inits: ' + quiz.title);
      self.emit('quiz-init', quiz);
    });
  },

  isRunning: function isRunning() { return !!this.currentQuestion; },

  nextQuestion: function nextQuestion() {
    if (0 === this.startedAt)
      return;

    var opts = { where: { visible: true }, order: 'position', limit: 1, include: [Answer] };
    if (this.questionIds) {
      if (!this.questionIds.length) {
        this.wrapUp();
        return;
      }
      opts.where['questions.id'] = this.questionIds.shift();
    } else if (this.currentQuestion) {
      opts.where.position = 'ge ' + this.currentQuestion.position;
    }
    var self = this;

    return this.currentQuiz.getQuestions(opts).success(function(qs) {
      console.log(qs);
      var question = qs[0];
      if (question) {
        self.currentQuestion = question;
        self.currentQuestionExpiresAt = Date.now() + question.duration * 1000;
        self.currentQuestionTimer = setTimeout(self.questionExpires, question.duration * 1000);
        self.currentQuestionInterval = setInterval(self.questionProgresses, 1000);
        redis.hmset(CUR_QUESTION_KEY, {
          id: self.currentQuestion.id,
          remaining: question.duration * 1000
        });
        log('info', 'Question starts: ' + question.title + ' (' + question.duration + 's)');
        self.emit('question-start', question, self.currentQuestionExpiresAt);
      } else {
        self.wrapUp();
      }
    });
  },

  questionExpires: function questionExpires() {
    clearInterval(this.currentQuestionInterval);
    clearTimeout(this.currentQuestionTimer);
    redis.del(CUR_QUESTION_KEY);

    log('info', 'Question ends!');
    this.emit('question-end'); // TODO: add current stats once computed
  },

  questionProgresses: function questionProgresses() {
    var remaining = this.currentQuestionExpiresAt - Date.now();
    redis.hset(CUR_QUESTION_KEY, 'remaining', remaining);
    log('debug', 'Question has only ' + (remaining / 1000) + 's remaining');
  },

  reset: function reset() {
    this.currentQuiz = this.currentQuestion = null;
    this.currentQuestionExpiresAt = this.startedAt = 0;
  },

  start: function start(callback) {
    this.startedAt = Date.now();
    delete this.questionIds;

    if ('random' !== this.currentQuiz.runningMode) {
      log('info', 'Quiz starts (sequential)');
      return this.nextQuestion();
    }

    var self = this;
    return this.currentQuiz.getQuestions({ where: { visible: true } }).then(function(qs) {
      self.questionIds = _.chain(qs).pluck('id').shuffle().value();
      log('info', 'Quiz starts (randomized to ' + self.questionIds.join() + ')');
    }).then(self.nextQuestion);
  },

  wrapUp: function wrapUp() {
    // FIXME: wrap up!
  }
});

colors.setTheme({
  debug: 'blue',
  error: 'red',
  info:  'green',
  warn:  'yellow'
});

function log(level, message) {
  message = '*** [' + moment().format('HH:MM:SS') + '] ' + message;
  (console[level] || console.log)(message[level]);
}

_.bindAll(Engine, 'nextQuestion', 'questionExpires', 'questionProgresses');

module.exports = Engine;
