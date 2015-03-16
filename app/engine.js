// Quiz-running engine
// ===================

'use strict';

var Quiz      = require('./models/quiz');
var Answer    = require('./models/answer');
var redis     = require('redis').createClient();
var _         = require('underscore');
var events    = require('events');
var async     = require('async');
var colors    = require('colors');
var moment    = require('moment');
var Promise   = require('promise');

// Persistence keys in the Redis store
// -----------------------------------

var CUR_QUESTION_KEY  = 'node-demo:current-question';
var PLAYERS_KEY       = 'node-demo:players';
var SCOREBOARD_KEY    = 'node-demo:score-board';
var USER_LIST_KEY     = 'node-demo:users';

// The Engine singleton
// --------------------

// This contains all the business logic for running the quiz; other parts
// of the app (admin pages and player-facing pages) end up calling its
// methods, and it emits events for various stages of the game.

var Engine = _.extend(new events.EventEmitter(), {
  currentQuiz: null,
  currentQuestion: null,
  currentQuestionExpiresAt: 0,
  currentQuestionTimer: null,
  questionCount: 0,
  questionIndex: 0,
  playerCount: 'Aucun joueur',
  startedAt: 0,

  // Authentication middleware helper
  // --------------------------------

  // This is called by the front pages to try and get the currently-logged
  // user back from the request's session or, failing that, from the
  // Redis-backed IP-to-player mapping, so we don't have to re-auth with
  // Twitter between two server starts.  This is especially useful during
  // dev, when the server auto-restarts at every code change.
  checkAuth: function(req, res, next) {
    var user = req.user;

    if (!user) {
      res.redirect(302, '/front/auth');
      return;
    }

    var self = this;

    var json = JSON.stringify(user), origScore;
    // Notice the use of [`async.waterfall`](https://github.com/caolan/async#waterfall)
    // here.  We make heavy use of that trick to chain multiple traditional (non-promise)
    // async call whose results feed into each other (at least for some of the calls).
    // This is one way of avoiding the “Pyramid of Doom” effect.
    async.waterfall([
      // 1. persist the current user in the players-scored-by-join-time sorted set.
      // Use their existing score, if any, to avoid bumping them to the end of the
      // list once they've joined in.
      function(cb)   { redis.zscore(USER_LIST_KEY, json, cb); },
      function(score, cb) { redis.zadd(USER_LIST_KEY, (origScore = score) || Date.now(), json, cb); },
      // 2. Check the amount of players to maintain our `playerCount` textual state.
      function(foo, cb)   { redis.zcard(USER_LIST_KEY, cb); },
      function(count, cb) {
        self.playerCount = count <= 0 ? 'Aucun joueur' : (1 === count ? 'Un joueur' : count + ' joueurs');
        if (self.currentQuiz && !self.isRunning() && !origScore)
          self.emit('quiz-join', user, self.playerCount);
        cb();
      },
      // This is a middleware: don't forget to pass on control to the
      // remainder of the stack once we're done.
      next
    ]);
  },

  resetUsers: function resetUsers(cb) {
    async.map(
      [CUR_QUESTION_KEY, PLAYERS_KEY, SCOREBOARD_KEY, USER_LIST_KEY],
      redis.del.bind(redis),
      cb
    );
  },

  // Scoreboard computation on quiz end
  // ----------------------------------

  // This computes the final scoreboard for the quiz once it's done,
  // and persists it into Redis so we can call it up whenever we want.
  // This sorts players by descending total score.  Ex-aequos are still
  // ranked separately (just being lazy here) in no particular order
  // amongst them.
  computeScoreboard: function computeScoreboard(cb) {
    var players;
    // `async.waterfall` again, as we have a number of async steps
    // feeding into each other.
    async.waterfall([
      // 1. Get the entire current-quiz players list.
      function(cb) { redis.hgetall(PLAYERS_KEY, cb); },
      // 2. Turn the resulting list into an ID+score tuple list
      // sorted by descending score.
      function(list, cb) {
        players = sortPlayerList(list);
        cb();
      },
      // 3. Grab the full user/player list and extend the sorted
      // user-ID list with full properties from it (name, avatar URL).
      // Also, persist the resulting scoreboard in Redis.
      this.getUsers,
      function(users, cb) {
        _.each(players, function(p, i) {
          var matchingUser = _.findWhere(users, { id: p.id });
          players[i] = _.extend(p, matchingUser);
        });
        redis.set(SCOREBOARD_KEY, JSON.stringify(players), cb);
      },
      // 4. Time to call the callback that was passed to us.  We
      // obey the Node convention of error first, data later, which
      // lets any other Node-assuming system, including `async`,
      // manipulate this very method with confidence.
      function() { cb(null, players); }
    ]);
  },

  // Stats computation on question end
  // ---------------------------------

  // When a question is done, we compute basic stats about it: what
  // the correct answers were, what percentages of answering players
  // selected each answer, what the overall correct answers ratio was,
  // and who the current leading players are.  All percentages are
  // rounded to the nearest integer.
  computeStats: function computeStats(pairs, cb) {
    // Gotta love Underscore. `_.pluck` grabs the same property out of
    // every iterable.  This is an optimized special case of `map`, just
    // like `_.invoke` would be for method calls.
    var correctStatuses = _.pluck(this.currentQuestion.answers, 'correct');

    // For every answer, determine how many players selected it.  Players
    // can select multiple answers.  This is based on the final state of
    // play once the question has timed out, as players can adjust their
    // answers until then.
    var answerSpreads = {};
    _.each(pairs, function(record) {
      record.answerIds.forEach(function(id) {
        id = +id;
        answerSpreads[id] = (answerSpreads[id] || 0) + 1;
      });
    });

    // Turn that list of raw counters into count+percentage pairs.  If no
    // player participated we'll get a weird rounding due to 0/0, so let's
    // workaround this by setting a floor of 1.
    var playerCount = Math.max(_.size(pairs), 1);
    answerSpreads = this.currentQuestion.answers.map(function(a) {
      var count = answerSpreads[a.id] || 0;
      return { count: count, percent: Math.round(count * 100 / playerCount) };
    });

    // Determine overall counts (and %) of fully-correct players
    var correctCount = _.where(pairs, { currentQuestionCorrect: true }).length;
    var correctPercent = Math.round(correctCount * 100 / playerCount);

    // Get the top 5 scores, and pick 10 random players inside that score range to
    // report as the currently-leading players.
    var sortedPlayers = sortPlayerList(pairs);
    var minimumScore = sortedPlayers.length ? Math.max(sortedPlayers[0].score - 4, 1) : 1;
    var top5Candidates = _.filter(sortedPlayers, function(p) { return p.score >= minimumScore; });
    var random10BestIds = _.chain(top5Candidates).sample(10).pluck('id').value();
    var random10Bests;

    // Again, `async.waterfall` lets us "chain" asynchronous operations without falling
    // into the Pyramid of Doom trap.
    async.waterfall([
      // 1. We have 10 user IDs: grab all users and map IDs to actual users.
      this.getUsers,
      function(users, cb) {
        random10Bests = _.filter(users, function(u) { return _.contains(random10BestIds, u.id); });
        cb();
      },
      // 2. Compute a textual representation and log it using our theme's debug color
      // (see below)
      function(cb) {
        var str = 'Answers: ';
        _.each(answerSpreads, function(spread, index) {
          // Question indices are turned into letters (A, B, etc.).  Correct answers
          // are suffixed with a star.
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
      // 3. Finally, invoke our passed callback with all proper stats.  We obey Node's
      // callback style (error, data…).
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

  // Just an accessor to gain access to the latest scoreboard, thanks to Redis storage.
  getLatestScoreboard: function getLatestScoreboard(cb) {
    redis.get(SCOREBOARD_KEY, function(err, json) {
      if (err) throw err;
      cb(null, JSON.parse(json));
    });
  },

  // A simple accessor to get the full list of players, least-recent first.  Note that
  // we let Redis maintain that sort order for us as we store in a sorted set with scores
  // based on join time.
  getUsers: function getUsers(cb) {
    redis.zrangebyscore(USER_LIST_KEY, 0, +Infinity, function(err, users) {
      cb(null, _.map(users, JSON.parse));
    });
  },

  // Entry point for answers by players.  The passed `answer` is expected to be of
  // the shape `{ userId: Number, answerIds: [Number…] }`.  This creates/updates
  // this player's answer to the current question, persisting it in Redis so it survives
  // server restarts.
  handleAnswer: function handleAnswer(answer) {
    if (!this.isRunning())
      return;

    // Make sure we have actual Numbers in there, not just Strings.
    // `Number(x)` is the nominal conversion protocol, so we can pass `Number` as a mapper
    // function.
    answer.answerIds = _.map(answer.answerIds, Number);
    var self = this;
    redis.hget(PLAYERS_KEY, answer.userId, function(err, record) {
      if (err) throw err;

      // Redis stores values as strings: parse the JSON out of it, if present
      // (further down, we'll JSONify back before re-storing).
      record = record ? JSON.parse(record) : { score: 0 };
      var firstTimeAnswer = record.currentQuestionId !== self.currentQuestion.id;
      record.currentQuestionId = self.currentQuestion.id;
      record.answerIds = answer.answerIds;
      // Update the "current answer set is correct" flag on the fly.
      record.currentQuestionCorrect = self.currentQuestion.checkAnswers(answer.answerIds);
      redis.hset(PLAYERS_KEY, answer.userId, JSON.stringify(record));

      // Notify the system that an answer was given/updated, and pass individual answer flags
      // along in case listeners react differently based on selected answer items.  Also pass
      // the answerer's ID, just in case.
      var bools = _.map(self.currentQuestion.answers, function(a) { return _.contains(answer.answerIds, a.id); });
      self.emit(firstTimeAnswer ? 'new-answer' : 'edit-answer', +answer.userId, bools);
    });
  },

  // Quiz activation/initialization
  // ------------------------------

  initQuiz: function initQuiz(quizId) {
    var self = this;
    self.reset('quiz');

    // In case we got passed a descriptor object, just get its `id`.
    if (quizId.id)
      quizId = quizId.id;

    // Returning a `find` result, even through `success`, means we return
    // a promise for calling code to chain against / wait for, making it
    // easier to write.
    return Quiz.find(quizId).success(function(quiz) {
      self.currentQuiz = quiz;
      log('info', 'Quiz inits: ' + quiz.title);
      // Initializing a quiz resets quiz-state storage, so all players start anew.
      redis.del(PLAYERS_KEY, function(err) {
        if (err) throw err;

        self.emit('quiz-init', quiz);
      });
    });
  },

  // Simple helper to tell whether a quiz is currently going on (not just init'd, but started).
  isRunning: function isRunning() { return !!this.currentQuestion; },

  // Quiz stepping
  // -------------

  // This is the core step-ahead mechanism for a quiz.  When a quiz starts, it
  // actually ends up delegating to this.  This returns a promise that calling code
  // can chain against / wait for to be sure that either the next question is up, or
  // the quiz is done, except if the quiz isn't even started (returns `undefined`).
  nextQuestion: function nextQuestion() {
    // Not started?  Forget it!
    if (0 === this.startedAt)
      return;

    // Next-question selector logic.  We build up selecting options for the ORM.

    var opts = { where: { visible: true }, order: 'question.position, answers.position',
      limit: 1, include: [Answer] };

    // If we run on a randomized quiz, starting it picked a random, one-time ordering
    // of the questions and stored it in `this.questionIds`, in which case we should
    // rely on it. If it's empty, the quiz is done.  Otherwise we'll grab the next
    // question ID and explictly fetch that one.  If there is no `questionIds` property,
    // we'll just get the next question by ascending `position` order, if any.

    if (this.questionIds) {
      if (!this.questionIds.length) {
        return this.wrapUp();
      }
      opts.where['questions.id'] = this.questionIds.shift();
    } else if (this.currentQuestion) {
      opts.where['questions.position'] = { gt: this.currentQuestion.position };
    }
    var self = this;

    // Here's our promise result, with a built-in success handler chained in.
    return this.currentQuiz.getQuestions(opts).success(function(qs) {
      var question = qs[0];
      if (question) {
        // There IS a next question matching our criteria?  Awesome, adjust state, persist
        // in Redis and get on with it!
        ++self.questionIndex;
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
        self.emit('question-start', question, self.currentQuestionExpiresAt,
          self.questionIndex, self.questionCount);
      } else {
        // There ISN'T any question left for our criteria: the quiz is done, wrap it up.
        self.wrapUp();
      }
    }).error(function(res) {
      console.error('SQL ERROR:', res);
    });
  },

  // Expiry handler bound to a timeout in `nextQuestion`’s success case.
  // This clears current timers/intervals, adjusts state, computes and persists
  // current player scores and question stats.
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

  // A simple every-second handler that just persists time passing in Redis
  // for potential fault tolerance and logs question progress.
  questionProgresses: function questionProgresses() {
    var remaining = this.currentQuestionExpiresAt - Date.now();
    redis.hset(CUR_QUESTION_KEY, 'remaining', remaining);
    log('debug', 'Question has only ' + (remaining / 1000) + 's remaining');
  },

  // A convenience state resetter for quiz and question starts.
  reset: function reset(mode) {
    if ('quiz' === mode) {
      this.currentQuiz = null;
      this.startedAt = 0;
      redis.del(PLAYERS_KEY);
    }
    clearTimeout(this.currentQuestionTimer);
    delete this.questionIds;
    this.currentQuestion = this.currentQuestionTimer = null;
    this.currentQuestionExpiresAt = this.currentQuestionIndex = this.questionCount = 0;

    return this;
  },

  // Quiz start
  // ----------

  // Once a quiz, post-init, has garnered enough players, we can officially start it.
  // For randomized quizzes, this defines a one-shot, random ordering of questions.
  // Then this delegates to `nextQuestion` to pop the first question and get going.
  start: function start() {
    this.startedAt = Date.now();
    this.reset('question');
    this.questionIndex = 0;
    var self = this;

    if ('random' !== this.currentQuiz.runningMode) {
      log('info', 'Quiz starts (sequential)');
      return this.currentQuiz.getQuestionCount().then(function(qCount) {
        self.questionCount = qCount;
      }).then(this.nextQuestion);
    } else {
      // Notice the two chained `.then` calls, that let us sequence asynchronous
      // functions the way we need them.  For Sequelize calls, `.then` calls are triggered
      // on success cases.
      return this.currentQuiz.getQuestions({ where: { visible: true } }).then(function(qs) {
        // Gotta love Underscore…
        self.questionIds = _.chain(qs).pluck('id').shuffle().value();
        self.questionCount = qs.length;
        log('info', 'Quiz starts (randomized to ' + self.questionIds.join() + ')');
      }).then(this.nextQuestion);
    }
  },

  // A convenience method called when a question ends, to increment the scores of every
  // player that was eventually correct, and persist the updated scores in Redis.
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

  // Quiz end
  // --------

  // This is called from `nextQuestion` when it detects the quiz is out of questions.
  // this computes the final scoreboard, persist it for later reads, resets state and
  // notifies the system.
  wrapUp: function wrapUp() {
    var self = this;
    // This is the one time we explictly create a Promise.  Because Sequelize already uses
    // [node-promise](https://github.com/kriszyp/node-promise), we stay with this, but this
    // code would have been a bit simpler with the [`q`](https://github.com/kriskowal/q)
    // library, where wrapping a regular async method in a promise would just go like
    // `Q.nfcall(self.computeScoreboard).then(function(scoreboard) { … })` with no need
    // to call `resolve` eventually.
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

// We log in color using not actual color names but semantic names defined in our theme:
// this is where we map to supported color codes.
colors.setTheme({
  debug: 'blue',
  error: 'red',
  info:  'green',
  warn:  'yellow'
});

// A convenience timestamped logger method used throughout the engine code.
function log(level, message) {
  message = '*** [' + moment().format('HH:mm:ss') + '] ' + message;
  (console[level] || console.log)(message[level]);
}

// A convenience method taking a Redis-issued hash of `{ userId: stateInfo }` tuples
// and turning it into a descending-score `Array` of `{ id: Number, score: Number }` tuples.
function sortPlayerList(pairs) {
  // This is a massive example of Underscore's power.  We let it operate in sequence on `pairs`,
  // JSON-decoding values on the fly, map to proper tuples, and sort by a computed property.
  // The equivalent JS code would take a fair number of lines…
  return _.chain(pairs)
    .map(function(rec, userId) {
      if (_.isString(rec))
        rec = JSON.parse(rec);
      return { id: userId, score: rec.score };
    })
    .sortBy(function(r) { return -r.score; })
    .value();
}

// The engine code often passes methods of the `Engine` singleton as references
// (as callbacks, or sequence items in `async.waterfall`, or other situations).  In
// such situations, JS would **lose scope** (lose the expected meaning of `this` to make
// it reference the global object).  So we ask Underscore to overwrite the necessary methods
// with a pre-bound version of them, one that is inherently attached to the `Engine` instance.
_.bindAll(Engine, 'computeStats', 'getUsers', 'handleAnswer', 'nextQuestion',
  'questionExpires', 'questionProgresses', 'updatePlayerScores');

module.exports = Engine;
