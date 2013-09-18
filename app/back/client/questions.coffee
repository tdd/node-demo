deleteAnswerClientSide = (e) ->
  e.preventDefault()
  e.stopImmediatePropagation()

  row = $(e.currentTarget).closest('tr')
  console.log row
  row.hide().find('input[name*="text"]').val ''

initQuestionsBack = ->
  ($ '#answers').on 'click', 'a[data-action="remove"]', deleteAnswerClientSide

# This feels so CLI! :-D
$ initQuestionsBack
