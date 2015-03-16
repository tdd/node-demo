// App entry point
// ===============

'use strict';

// Requiring this module runs the app.  It is, for instance, required
// by the CLI interface (`.bin/blend-demo`) when it is done setting up.

var bodyParser     = require('body-parser');
var cookieSession  = require('cookie-session');
var csurf          = require('csurf');
var express        = require('express');
var flash          = require('connect-flash');
var http           = require('http');
var methodOverride = require('method-override');
var morgan         = require('morgan');
var passport       = require('passport');
var path           = require('path');

require('express-namespace');

// Create the core web app container (`app`), bind and HTTP server to it
// (`server`) and determine the full path for public assets.
var app = express();
var server = http.createServer(app);
var publicPath = path.join(__dirname, '..', 'public');

// Configuration
// -------------

// Configuration and middleware for all environments (dev, prod, etc.)
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(morgan('development' === app.get('env') ? 'dev' : 'default'));
// Static file serving
app.use(express.static(publicPath));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(methodOverride());
app.use(cookieSession({ key: 'node-demo:session', secret: "Node.js c’est de la balle !" }));
app.use(csurf());
// This is not Adobe's Flash!  This is session flashes--messages that are
// only retained until the next view rendered for the session.
app.use(flash());
// Passport initialization (authentication middleware and schemes)
app.use(passport.initialize());
app.use(passport.session());

// Make the session flash and params readable by all views
app.use(function(req, res, next) {
  res.locals.flash = req.flash();
  res.locals.query = req.query;
  res.locals.csrfToken = req.csrfToken();
  next();
});

// Shared locals for all views
app.locals.title = "Node Demo @ Mix-IT 2014";
app.locals.marked = require('marked');

// Development-only configuration (full error logging)
if ('development' === app.get('env')) {
  app.use(require('errorhandler')());
  app.locals.pretty = true;
}

// Main app "submodules"
// ---------------------

// Because Express will automatically insert the Router middleware as soon as
// we define a route, we need to run our subapp setups in two blocks:
// middlewares first, then routes.
require('./back')(app);
require('./front')(app, server);

// If you have a proper Arduino board connected (check the annotated
// source of the `arduino.js` module), uncomment that line to start
// the module.
// require('./arduino');

// This actually launches the server by listening on the relevant port for
// incoming HTTP connections.  The default port is 3000.
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
