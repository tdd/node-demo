// Quiz model
// ==========

'use strict';

var db = require('./db');

var Quiz = db.define('quiz', {
  title:        { type: db.types.STRING, allowNull: false, unique: true,
                  validate: { notEmpty: true } },
  description:  db.types.TEXT,
  level:        { type: db.types.INTEGER, allowNull: false, defaultValue: 3,
                  validate: { min: 1, max: 5 } },
  runningMode:  { type: db.types.STRING(16), allowNull: false, defaultValue: 'ordered',
                  validate: { isIn: [['ordered', 'random']] } },
  visible:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: false }
}, {
  instanceMethods: {
    // Helper method to get the next available position for a new question in a quiz
    getNextQuestionPosition: function getNextQuestionPosition() {
      return Quiz.daoFactoryManager.sequelize.query(
        'SELECT MAX(position) + 1 AS maxPos FROM questions WHERE quizId = :id', null,
        { raw: true, plain: true }, { id: this.id }).then(function(h) { return h.maxPos; });
    },

    getQuestionCount: function getQuestionCount() {
      return Quiz.daoFactoryManager.sequelize.query(
        'SELECT COUNT(id) AS qCount FROM questions WHERE quizId = :id', null,
        { raw: true, plain: true }, { id: this.id })
      .then(function(h) { return h.qCount; });
    },

    isCurrent: function isCurrent() {
      var engine = require('../engine');
      return engine.currentQuiz && engine.currentQuiz.id === this.id;
    },

    isStarted: function isStarted() {
      var engine = require('../engine');
      return this.isCurrent() && engine.isRunning();
    }
  }
});

// Ensure the table exists in the DB
Quiz.sync();

module.exports = Quiz;
