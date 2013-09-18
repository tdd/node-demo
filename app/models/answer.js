var db = require('./db');
var Question = require('./question');

var Answer = db.define('answer', {
  text:         { type: db.types.STRING, allowNull: false, validate: { notEmpty: true } },
  position:     { type: db.types.INTEGER, allowNull: false, defaultValue: 1,
                  validate: { min: 1 } },
  correct:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: false }
});

Question.hasMany(Answer, { onDelete: 'cascade' });
Answer.belongsTo(Question);

Answer.sync();

module.exports = Answer;
