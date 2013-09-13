var Sequelize = require('sequelize');
var path = require('path');

var db = new Sequelize('main', null, null, {
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', '..', 'blend-demo.db'),
});

// Just a comfort wrapper
db.types = Sequelize;

module.exports = db;
