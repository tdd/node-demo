var express = require('express');
    require('express-namespace');
var http = require('http');
var path = require('path');
var passport = require('passport');

var app = express();
var publicPath = path.join(__dirname, '..', 'public');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger(app.get('env') === 'development' ? 'dev' : 'default'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('I can haz BLEND demo!'));
app.use(express.session());
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(publicPath));

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
