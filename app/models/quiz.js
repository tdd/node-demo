var db = require('./db');
var _ = require('underscore');

var Quiz = db.define('quiz', {
  title:        { type: db.types.STRING, allowNull: false, unique: true,
                  validate: { notEmpty: true } },
  description:  db.types.TEXT,
  level:        { type: db.types.INTEGER, allowNull: false, defaultValue: 3,
                  validate: { min: 1, max: 5 } },
  runningMode:  { type: db.types.STRING(16), allowNull: false, defaultValue: 'ordered',
                  validate: { isIn: [['ordered', 'random']] } },
  tags:         { type: db.types.STRING, set: setTags },
  visible:      { type: db.types.BOOLEAN, allowNull: false, defaultValue: false }
});

var RE_SURROUNDING_WHITESPACE = /^\s+|\s+$/g;

function setTags(tags) {
  if (tags instanceof Array)
    tags = tags.join(',');

  tags = parseTags(tags);
  if (0 === tags.length)
    tags = null;

  this.setDataValue('tags', tags && tags.join(','));

  return tags;
}

function parseTags(str) {
  tags = String(str || '').split(',').map(function(t) {
    return t.replace(RE_SURROUNDING_WHITESPACE, '');
  });

  return _.uniq(_.without(tags, '').sort(), true);
}

Quiz.sync();

module.exports = Quiz;
