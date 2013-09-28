socket = io.connect()

socket.on 'quiz-init', (quiz, users) ->
  initTpl = require('front/views/quiz_init')
  initView = initTpl(quiz: quiz, users: users)
  ($ '#coreContainer').html initView

socket.on 'quiz-join', (user) ->
  joinTpl = require('front/views/quiz_user')
  joinView = joinTpl(user: user)
  ($ '#players').append joinView
  $(document).trigger 'tooltips:refresh', $('#players [data-toggle="tooltip"]').last()
