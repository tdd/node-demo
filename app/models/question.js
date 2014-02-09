// Question model
// ==============

'use strict';

var db      = require('./db');
var Quiz    = require('./quiz');
var _       = require('underscore');
var toolkit = require('../client/toolkit');

var Question = db.define('question', {
  title:        { type: db.types.STRING, allowNull: false, validate: { notEmpty: true } },
  duration:     { type: db.types.INTEGER, allowNull: false, defaultValue: 20,
                  validate: { min: 5, max: 300 } },
  position:     { type: db.types.INTEGER, allowNull: false, defaultValue: 1,
                  validate: { min: 1 } },
  visible:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  instanceMethods: {
    // Helper method checking that a series of answer IDs turns out to be this question's
    // correct answers (no requirement on the order)
    checkAnswers: function(ids) {
      this.correctIds = this.correctIds ||
        _.chain(this.answers || []).where({ correct: true }).pluck('id').value().sort();

      return _.isEqual(_.map(ids, Number).sort(), this.correctIds);
    },

    remainingTime: toolkit.remainingTime,

    toJSON: function questionToJSON() {
      return {
        title: this.title,
        answers: _.map(this.answers || [], function(a) { return _.pick(a, 'id', 'text'); })
      };
    }
  }
});

// Relationships Quiz/Question that define accessors and finders.
Quiz.hasMany(Question, { onDelete: 'cascade' });
Question.belongsTo(Quiz);

// Ensure the table exists in the DB
Question.sync();

module.exports = Question;
