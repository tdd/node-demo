/*
 * Backoffice sub-app for quiz management (quizzes and questions).
 */

var path = require('path');

module.exports = backOfficeApp;

function backOfficeApp(app) {
  // Subapp-local views
  app.use('/admin', function logReqs(req, res, next) {
    app.set('views', path.join(__dirname, 'views'));
    next();
  });
  // Namespaced routes
  app.namespace('/admin', function() {
    app.get('/', quizListing);
  });
}

function quizListing(req, res) {
  res.render('index');
}
