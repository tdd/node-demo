// Arduino bridge
// ==============

// Simply requiring this module lets us control an Arduino-driven
// feedback based on subscriptions to the `Engine`’s events.  This
// requires having connected an Arduino board with a Standard Firmata
// on it, cabled to a circuit or breadboard as described in
// [this diagram](./blend-demo-arduino.png).

require('colors');
var engine = require('./engine');
// Johnny-Five is the high-level JS interface to the `firmata` module, which
// itself relies on the `serialport` module to communicate over USB to the
// Firmata flashed onto the Arduino board.
var five   = require('johnny-five');
var _      = require('underscore');

var lcd, green, yellow, red;

// Connect to the board; do not attempt to setup a REPL.
var board = new five.Board({ repl: false });
board.on('ready', function() {
  console.log('Arduino board ready'.debug);

  // We're assuming a standard 2x16 LCD display that we're going to use in
  // the usual 4-bit mode.
  lcd = new five.LCD({
    //     RS  EN  DB4 DB5 DB6 DB7
    pins: [5,  6,  7,  8,  9,  10]
  });
  lcd.on('ready', function() {
    lcd.clear().print('Welcome Mix-IT');
  });

  green  = new five.Led({ pin: 11 }).off();
  yellow = new five.Led({ pin: 12 }).off();
  red    = new five.Led({ pin: 13 }).off();

  bindToEngine();
});

// This subscribes to the quiz engine's events in order to provide live
// feedback on the board through the LCD display and, when a question ends,
// the LCD LEDs.
function bindToEngine() {
  engine.on('quiz-init', function(quiz) {
    clearLEDs();
    lcd.clear().cursor(0, 0).print(quiz.title.slice(0, 16));
    secondRow('Quiz initializes:');
  });

  engine.on('quiz-join', function(user, playerCount) {
    // playerCount is actually formatted text: let's strip it
    // down to its counter
    playerCount = playerCount.match(/\d+/);
    secondRow(playerCount + ' - ' + user.name);
  });

  engine.on('question-start', function(question) {
    clearLEDs();
    lcd.clear().cursor(0, 0).print('Q: ' + question.title.slice(0, 13));
  });

  engine.on('question-end', function(stats) {
    // Compute a text for the second row using question-rank letters
    // (A, B, etc.) and reply percentages.  Prefix the correct answers
    // with a star.  e.g. 'A 25% *B 80% C 10%' (multiple answers allowed).
    var text = '';
    _.each(stats.spreads, function(spread, index) {
      if (stats.statuses[index])
        text += '*';
      text += spread.percent + '%';
      if (index < stats.spreads.length - 1)
        text += ' ';
    });
    secondRow(text);

    // Light the proper LED.  Green if >= 67% of the players have provided
    // the correct answer set.  Yellow if 34-66%.  Red under 34%.
    var led = green;
    if (stats.correctPercent < 67)
      led = yellow;
    if (stats.correctPercent < 34)
      led = red;
    led.on();
  });

  engine.on('quiz-end', function() {
    lcd.clear().cursor(0, 0).print('Quiz done!');
    clearLEDs();
  });
}

function clearLEDs() {
  green.off();
  yellow.off();
  red.off();
}

var EMPTY_TEXT = new Array(17).join(' ');

function secondRow(text) {
  lcd.cursor(1, 0).print(EMPTY_TEXT);
  lcd.cursor(1, 0).print(text.slice(0, 16));
}
