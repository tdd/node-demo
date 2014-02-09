// Isomorphic misc helpers
// =======================

// A simple remaining-time formatter used by server-rendered views
// and client-rendered views alike.

function remainingTime() {
  if (undefined === this.expiresAt)
    return '';

  var secs = Math.round((this.expiresAt - Date.now()) / 1000);
  if (secs < 0)
    secs = 0;
  var mins = Math.floor(secs / 60);
  secs -= mins * 60;
  mins = mins >= 10 ? mins : '0' + mins;
  secs = secs >= 10 ? secs : '0' + secs;
  return mins + ':' + secs;
}

exports.remainingTime = remainingTime;
