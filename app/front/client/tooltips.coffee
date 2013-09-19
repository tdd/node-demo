initTooltip = (elt) -> $(elt).tooltip()

initPreloadedTooltips = ->
  $('[data-toggle="tooltip"]').each (_, elt) -> initTooltip elt

# This feels so CLI :-)
$ initPreloadedTooltips
