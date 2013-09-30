toolkit = require('client/toolkit')

socket = io.connect()

answersAcceptable = false

# Rendering helper
# ================

renderCoreView = (tpl, hasHeader, params) ->
  tpl = require("front/views/#{tpl}")
  html = tpl(_.omit(params, 'render'))
  ($ '.page-header')[if hasHeader then 'show' else 'hide']()
  ($ '#coreContainer').html html unless params.render?
  params.render? html

# Realtime server-to-client notifications
# =======================================

socket.on 'quiz-init', (quiz, users) ->
  renderCoreView 'quiz_init', true, quiz: quiz, users: users

socket.on 'quiz-join', (user) ->
  renderCoreView 'quiz_user', true, user: user, render: (html) ->
    ($ '#players').append html
    $(document).trigger 'tooltips:refresh', $('#players [data-toggle="tooltip"]').last()

socket.on 'question-start', (question, expiresAt) ->
  question.expiresAt = expiresAt
  question.remainingTime = toolkit.remainingTime
  answersAcceptable = true
  renderCoreView 'question', false, question: question

  chrono = ->
    clearInterval itv if question.expiresAt <= Date.now()
    ($ '#countDown').text question.remainingTime()

  itv = setInterval(chrono, 1000)

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
