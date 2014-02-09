# Back client-side question mgmt
# ==============================

# React to answer deletion buttons by removing the table row for it.
# As all answers are inlined in the host question form, it will get
# properly deleted when the host form is submitted.
deleteAnswerClientSide = (e) ->
  e.preventDefault()
  e.stopImmediatePropagation()

  row = $(e.currentTarget).closest('tr')
  console.log row
  row.hide().find('input[name*="text"]').val ''

# Hook answer deletion buttons (through event delegation) for client-side
# removal UX.
initQuestionsBack = ->
  ($ '#answers').on 'click', 'a[data-action="remove"]', deleteAnswerClientSide

# This feels so CLI! :-D
$ initQuestionsBack
