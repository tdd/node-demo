// Core DB connection
// ==================

'use strict';

var Sequelize = require('sequelize');
var path = require('path');

var db = new Sequelize('main', null, null, {
  // We use SQLite3 for simplicity's sake
  dialect: 'sqlite',
  logging: 'binary' === process.env.NODE_ENV ? false : console.log,
  // Our DB is a `blend-demo.db` file in the app's root directory
  storage: path.join(__dirname, '..', '..', 'node-demo.db'),
});

// Just a comfort wrapper
db.types = Sequelize;

module.exports = db;
