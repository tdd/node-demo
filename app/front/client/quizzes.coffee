# Front client-side quiz UX
# =========================

toolkit = require('client/toolkit')

socket = io.connect()

answersAcceptable = false

# Rendering helper
# ----------------

marked = (s) ->
  s.replace(/`(.+?)`/g, '<tt>$1</tt>').replace(/\*(.+?)\*/g, '<em>$1</em>')

renderCoreView = (tpl, hasHeader, params) ->
  tpl = require("front/views/#{tpl}")
  html = tpl(_.extend(_.omit(params, 'render'), marked: marked))
  ($ '.page-header')[if hasHeader then 'show' else 'hide']()
  ($ '#coreContainer').html html unless params.render?
  params.render? html

# Realtime server-to-client notifications
# ---------------------------------------

socket.on 'quiz-init', (quiz, users) ->
  renderCoreView 'quiz_init', true, quiz: quiz, users: users

socket.on 'quiz-join', (user) ->
  renderCoreView 'quiz_user', true, user: user, render: (html) ->
    ($ '#players').append html
    $(document).trigger 'tooltips:refresh', $('#players [data-toggle="tooltip"]').last()

# Question starts: update UI and start countdown
socket.on 'question-start', (question, expiresAt, index, count) ->
  question.expiresAt = expiresAt
  question.remainingTime = toolkit.remainingTime
  answersAcceptable = true
  renderCoreView 'question', false, question: question, questionIndex: index, questionCount: count

  chrono = ->
    clearInterval itv if question.expiresAt <= Date.now()
    ($ '#countDown').text question.remainingTime()

  itv = setInterval(chrono, 1000)

# Question ends: adapt the UI to render player stats and correct answers.
# Also, forbid further answering until further notice.
socket.on 'question-end', (stats) ->
  answersAcceptable = false
  btns = $('button')
  for correct, index in stats.statuses
    btn = $(btns[index])
    btn.toggleClass 'btn-success', correct
    spread = stats.spreads[index]
    btn.prepend "<strong>#{spread.count} (#{spread.percent}%)</strong> "

socket.on 'quiz-end', (scoring) ->
  renderCoreView 'quiz_end', true, scoring: scoring

# In-page UX (answer picks)
# =========================

userId = null

fetchUserId = ->
  userId = ($ 'meta[name="user-id"]').attr('content')

# Grab clicks on any displayed button to toggle the selection of that answer and
# turn it, if relevant at that point in time, into a WebSocket-driven answer
# notification towards the server.
handleButtonPress = (e) ->
  e.currentTarget.blur()
  unless answersAcceptable
    e.preventDefault()
    return

  button = $(e.currentTarget)
  button.toggleClass 'btn-default btn-primary'
  answerIds = (+($ btn).attr('value') for btn in ($ 'button.btn-primary'))
  socket.emit 'answer', userId: userId, answerIds: answerIds

($ document).on 'click', 'button', handleButtonPress

# Gotta love that CLI feelin'!
$ fetchUserId
