toolkit = require('client/toolkit')

socket = io.connect()

ajaxifyStarts = ->
  $('form[data-action="start"]').on 'submit', (e) ->
    e.preventDefault()
    form = $(@)
    form.prev('.start-notice').show()
    ($ '.alert').hide()
    $.ajax form.attr('action'),
      type: form.attr('method')
      data: form.serialize()

ajaxifyNext = ->
  $(document).on 'click', 'a#nextQuestion', (e) ->
    e.preventDefault()
    $.ajax(e.currentTarget.href, type: 'post', data: { _method: 'put' })

maintainBackPlayerCount = ->
  counter = $('#currentPlayers')
  return unless counter.length

  socket.on 'quiz-join', (user, playerCountStr) ->
    counter.text playerCountStr

maintainQuestionFeedback = ->
  series = $('#currentAnswers')
  countDown = $('#countDown')
  feedback = $('#feedback')
  feedbackTpl = require('back/client/question_stats')

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

  socket.on 'question-end', (stats, quizId) ->
    countDown.hide()
    series.hide()
    feedback.html feedbackTpl({ stats: stats, quizId: quizId })

  socket.on 'new-answer', (userId) ->
    series.append "<li data-user-id='#{userId}'>•</li>"

  socket.on 'edit-answer', (userId) ->
    series.find("li[data-user-id=#{userId}]").addClass 'changed'

  socket.on 'quiz-end', ->
    window.location.href = '/admin/quizzes/scoreboard'

$ ->
  ajaxifyStarts()
  ajaxifyNext()
  maintainBackPlayerCount()
  maintainQuestionFeedback()
