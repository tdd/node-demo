# Front client-side tooltips
# ==========================

# Provide Bootstrap tooltips for relevant UI elements.

initTooltip = (elt) -> $(elt).tooltip()

initPreloadedTooltips = ->
  $('[data-toggle="tooltip"]').each (_, elt) -> initTooltip elt

# Listen to a custom event that other pieces of client-side code
# can trigger when they inject new tooltip-bearing UI elements
# in the page.  This keeps things decoupled.
$(document).on 'tooltips:refresh', (e, elt) -> initTooltip elt

# This feels so CLI :-)
$ initPreloadedTooltips
