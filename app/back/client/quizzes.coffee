# Back client-side quiz mgmt
# ==========================

# The toolkit box is shared by the backoffice UI and frontoffice UI.
toolkit = require('client/toolkit')

socket = io.connect()

# Hook quiz starter buttons to ajaxify it and stay on page.
ajaxifyStarts = ->
  $('form[data-action="start"]').on 'submit', (e) ->
    e.preventDefault()
    form = $(@)
    form.prev('.start-notice').show()
    ($ '.alert').hide()
    $.ajax form.attr('action'),
      type: form.attr('method')
      data: form.serialize()

# Hook the "next question" button (through event delegation, as
# it may get in the page later on) to ajaxify it and stay on page.
ajaxifyNext = ->
  $(document).on 'click', 'a#nextQuestion', (e) ->
    e.preventDefault()
    $.ajax(e.currentTarget.href, type: 'post', data: { _method: 'put' })

# React to quiz joins by updating the displayed player counts on
# the current quiz (post-init).
maintainBackPlayerCount = ->
  counter = $('#currentPlayers')
  return unless counter.length

  socket.on 'quiz-join', (user, playerCountStr) ->
    counter.text playerCountStr

# Hook into workflow notifications to update the back UI
# in the quiz listing.
maintainQuestionFeedback = ->
  series = $('#currentAnswers')
  countDown = $('#countDown')
  feedback = $('#feedback')
  feedbackTpl = require('back/client/question_stats')

  # Question starts clean up the dynamic UI and start
  # the countdown.
  socket.on 'question-start', (question, expiresAt) ->
    series.html('').show()
    feedback.html ''
    question.expiresAt = expiresAt
    question.remainingTime = toolkit.remainingTime
    countDown.text(question.remainingTime()).show()

    chrono = ->
      clearInterval itv if question.expiresAt <= Date.now()
      countDown.text question.remainingTime()

    itv = setInterval(chrono, 1000)

  # React to question-end stats by displaying them using a shared
  # stats view (which also contains a "next question" button).
  socket.on 'question-end', (stats, quizId) ->
    countDown.hide()
    series.hide()
    feedback.html feedbackTpl({ stats: stats, quizId: quizId })

  # Display dots when answers get sent to the engine.  First-answer
  # is a blue dot, re-answer turns the dot orange.
  socket.on 'new-answer', (userId) ->
    series.append "<li data-user-id='#{userId}'>•</li>"

  socket.on 'edit-answer', (userId) ->
    series.find("li[data-user-id=#{userId}]").addClass 'changed'

  # Quiz ends?  Redirect to scoreboard!
  socket.on 'quiz-end', ->
    window.location.href = '/admin/quizzes/scoreboard'

$ ->
  ajaxifyStarts()
  ajaxifyNext()
  maintainBackPlayerCount()
  maintainQuestionFeedback()
