initTooltip = (elt) -> $(elt).tooltip()

initPreloadedTooltips = ->
  $('[data-toggle="tooltip"]').each (_, elt) -> initTooltip elt

$(document).on 'tooltips:refresh', (e, elt) -> initTooltip elt

# This feels so CLI :-)
$ initPreloadedTooltips
