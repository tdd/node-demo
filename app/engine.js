var Quiz      = require('./models/quiz');
var Question  = require('./models/question');
var Answer    = require('./models/answer');
var redis     = require('redis').createClient();
var _         = require('underscore');
var events    = require('events');
var async     = require('async');
var colors    = require('colors');
var moment    = require('moment');
var Promise   = require('promise');

// The quiz running engine (business logic)
// ========================================

var AUTH_PERSIST_KEY  = 'blend-demo:ips-to-users';
var CUR_QUESTION_KEY  = 'blend-demo:current-question';
var PLAYERS_KEY       = 'blend-demo:players';
var SCOREBOARD_KEY    = 'blend-demo:score-board';
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

  computeScoreboard: function computeScoreboard(cb) {
    var self = this, players;
    async.waterfall([
      function(cb) { redis.hgetall(PLAYERS_KEY, cb); },
      function(list, cb) {
        players = sortPlayerList(list);
        cb();
      },
      this.getUsers,
      function(users, cb) {
        _.each(players, function(p, i) {
          var matchingUser = _.findWhere(users, { id: p.id });
          players[i] = _.extend(p, matchingUser);
        });
        redis.set(SCOREBOARD_KEY, JSON.stringify(players), cb);
      },
      function() { cb(null, players); }
    ]);
  },

  computeStats: function computeStats(pairs, cb) {
    var correctStatuses = _.pluck(this.currentQuestion.answers, 'correct');

    var answerSpreads = {};
    _.each(pairs, function(record) {
      record.answerIds.forEach(function(id) {
        id = +id;
        answerSpreads[id] = (answerSpreads[id] || 0) + 1;
      });
    });
    var playerCount = _.size(pairs);
    answerSpreads = this.currentQuestion.answers.map(function(a) {
      var count = answerSpreads[a.id] || 0;
      return { count: count, percent: Math.round(count * 100 / playerCount) };
    });

    var correctCount = _.where(pairs, { currentQuestionCorrect: true }).length;
    var correctPercent = Math.round(correctCount * 100 / playerCount);

    var sortedPlayers = sortPlayerList(pairs);
    var minimumScore = sortedPlayers.length ? Math.max(sortedPlayers[0].score - 4, 1) : 1;
    var top5Candidates = _.filter(sortedPlayers, function(p) { return p.score >= minimumScore; });
    var random10BestIds = _.chain(top5Candidates).sample(10).pluck('id').value();
    var random10Bests;

    async.waterfall([
      this.getUsers,
      function(users, cb) {
        random10Bests = _.filter(users, function(u) { return _.contains(random10BestIds, u.id); });
        cb();
      },
      function(cb) {
        var str = 'Answers: ';
        _.each(answerSpreads, function(spread, index) {
          str += String.fromCharCode(index + 65);
          str += (correctStatuses[index] ? '*' : ' ');
          str += ': ' + spread.count + ' (' + spread.percent + '%)';
          if (index < answerSpreads.length - 1)
            str += ' / ';
        });
        log('debug', str);
        log('debug', correctCount + ' correct answers total (' + correctPercent + '%)');
        log('debug', 'Random 10 Best: ' + _.pluck(random10Bests, 'name').join(', '));
        cb();
      },
      function() {
        cb(null, {
          correctCount: correctCount,
          correctPercent: correctPercent,
          spreads: answerSpreads,
          statuses: correctStatuses,
          random10Bests: random10Bests
        });
      }
    ]);
  },

  getLatestScoreboard: function getLatestScoreboard(cb) {
    redis.get(SCOREBOARD_KEY, function(err, json) {
      if (err) throw err;
      cb(null, JSON.parse(json));
    });
  },

  getUsers: function getUsers(cb) {
    redis.zrangebyscore(USER_LIST_KEY, 0, +Infinity, function(err, users) {
      cb(null, _.map(users, JSON.parse));
    });
  },

  handleAnswer: function handleAnswer(answer) {
    if (!this.isRunning())
      return;

    answer.answerIds = _.map(answer.answerIds, Number);
    var self = this;
    redis.hget(PLAYERS_KEY, answer.userId, function(err, record) {
      if (err) throw err;

      record = record ? JSON.parse(record) : { score: 0 };
      var firstTimeAnswer = record.currentQuestionId !== self.currentQuestion.id;
      record.currentQuestionId = self.currentQuestion.id;
      record.answerIds = answer.answerIds;
      record.currentQuestionCorrect = self.currentQuestion.checkAnswers(answer.answerIds);
      redis.hset(PLAYERS_KEY, answer.userId, JSON.stringify(record));

      var bools = _.map(self.currentQuestion.answers, function(a) { return _.contains(answer.answerIds, a.id); });
      self.emit(firstTimeAnswer ? 'new-answer' : 'edit-answer', +answer.userId, bools);
    });
  },

  initQuiz: function initQuiz(quizId) {
    var self = this;
    self.reset('quiz');

    return Quiz.find(quizId).success(function(quiz) {
      self.currentQuiz = quiz;
      log('info', 'Quiz inits: ' + quiz.title);
      redis.del(PLAYERS_KEY, function(err) {
        if (err) throw err;

        self.emit('quiz-init', quiz);
      });
    });
  },

  isRunning: function isRunning() { return !!this.currentQuestion; },

  nextQuestion: function nextQuestion() {
    if (0 === this.startedAt)
      return;

    var opts = { where: { visible: true }, order: 'position', limit: 1, include: [Answer] };
    if (this.questionIds) {
      if (!this.questionIds.length) {
        return this.wrapUp();
      }
      opts.where['questions.id'] = this.questionIds.shift();
    } else if (this.currentQuestion) {
      opts.where.position = 'ge ' + this.currentQuestion.position;
    }
    var self = this;

    return this.currentQuiz.getQuestions(opts).success(function(qs) {
      var question = qs[0];
      if (question) {
        self.currentQuestion = question;
        self.currentQuestionExpiresAt = Date.now() + question.duration * 1000;
        self.currentQuestion.expiresAt = self.currentQuestionExpiresAt;
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

    var self = this;
    async.waterfall([
      this.updatePlayerScores,
      this.computeStats,
      function(stats) {
        log('info', 'Question ends!');
        self.emit('question-end', stats, self.currentQuiz.id);
      }
    ]);
  },

  questionProgresses: function questionProgresses() {
    var remaining = this.currentQuestionExpiresAt - Date.now();
    redis.hset(CUR_QUESTION_KEY, 'remaining', remaining);
    log('debug', 'Question has only ' + (remaining / 1000) + 's remaining');
  },

  reset: function reset(mode) {
    if ('quiz' == mode) {
      this.currentQuiz = null;
      this.startedAt = 0;
      redis.del(PLAYERS_KEY);
    }
    clearTimeout(this.currentQuestionTimer);
    delete this.questionIds;
    this.currentQuestion = this.currentQuestionTimer = null;
    this.currentQuestionExpiresAt = 0;

    return this;
  },

  start: function start(callback) {
    this.startedAt = Date.now();
    this.reset('question');

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

  updatePlayerScores: function updatePlayerScores(cb) {
    redis.hgetall(PLAYERS_KEY, function(err, pairs) {
      if (err) throw err;

      _.each(pairs, function(rec, userId) {
        pairs[userId] = rec = JSON.parse(rec);
        if (rec.currentQuestionCorrect) {
          ++rec.score;
          redis.hset(PLAYERS_KEY, userId, JSON.stringify(rec));
        }
      });
      log('debug', 'Player scores updated');
      cb(null, pairs);
    });
  },

  wrapUp: function wrapUp() {
    var self = this;
    return new Promise(function(resolve) {
      self.computeScoreboard(function(err, scoreboard) {
        if (err) throw err;
        self.reset('quiz');
        self.emit('quiz-end', scoreboard);
        resolve();
      });
    });
  }
});

colors.setTheme({
  debug: 'blue',
  error: 'red',
  info:  'green',
  warn:  'yellow'
});

function log(level, message) {
  message = '*** [' + moment().format('HH:mm:ss') + '] ' + message;
  (console[level] || console.log)(message[level]);
}

function sortPlayerList(pairs) {
  return _.chain(pairs)
    .map(function(rec, userId) {
      if (_.isString(rec))
        rec = JSON.parse(rec);
      return { id: userId, score: rec.score };
    })
    .sortBy(function(r) { return -r.score; })
    .value();
}

_.bindAll(Engine, 'computeStats', 'getUsers', 'handleAnswer', 'nextQuestion',
  'questionExpires', 'questionProgresses', 'updatePlayerScores');

module.exports = Engine;
