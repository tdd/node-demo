var express = require('express');
    require('express-namespace');
var flash = require('connect-flash');
var http = require('http');
var path = require('path');
var passport = require('passport');

var app = express();
var publicPath = path.join(__dirname, '..', 'public');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(express.logger(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('I can haz BLEND demo!'));
app.use(express.session());
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(publicPath));

// Make the flash readable by all views
app.use(function(req, res, next) {
  app.locals.flash = req.flash();
  next();
});

// Shared locals for all views
app.locals.title = "BLEND JS Quiz (Node Demo)";

// development only
app.configure('development', function() {
  app.use(express.errorHandler());
});

// app modules
require('./back')(app);
app.use(app.router);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
