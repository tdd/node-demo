var db = require('./db');
var Quiz = require('./quiz');

var Question = db.define('question', {
  title:        { type: db.types.STRING, allowNull: false, validate: { notEmpty: true } },
  duration:     { type: db.types.INTEGER, allowNull: false, defaultValue: 15,
                  validate: { min: 5, max: 300 } },
  position:     { type: db.types.INTEGER, allowNull: false, defaultValue: 1,
                  validate: { min: 1 } },
  visible:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: true }
});

Quiz.hasMany(Question, { onDelete: 'cascade' });
Question.belongsTo(Quiz);

Question.sync();

module.exports = Question;
