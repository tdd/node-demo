var db      = require('./db');
var Quiz    = require('./quiz');
var _       = require('underscore');
var toolkit = require('../client/toolkit');

var Question = db.define('question', {
  title:        { type: db.types.STRING, allowNull: false, validate: { notEmpty: true } },
  duration:     { type: db.types.INTEGER, allowNull: false, defaultValue: 15,
                  validate: { min: 5, max: 300 } },
  position:     { type: db.types.INTEGER, allowNull: false, defaultValue: 1,
                  validate: { min: 1 } },
  visible:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: true }
}, {
  instanceMethods: {
    checkAnswers: function(ids) {
      this.correctIds = this.correctIds ||
        _.chain(this.answers || []).where({ correct: true }).pluck('id').value().sort();

      return _.isEqual(_.map(ids, Number).sort(), this.correctIds);
    },

    multiple: function multiple() {
      return _.where(this.answers, { correct: true }).length > 1;
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

Quiz.hasMany(Question, { onDelete: 'cascade' });
Question.belongsTo(Quiz);

Question.sync();

module.exports = Question;
