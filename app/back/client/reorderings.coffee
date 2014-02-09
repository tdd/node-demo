# Backoffice ajaxified reorderings
# ================================

# Question reordering inside a quiz (questions tab).
# Reordering is persisted through Ajax on-the-fly so
# no extra submission is required.

PERSIST_URL_ATTR = 'data-remote-url'

adjustFields = (set) ->
  set.find('tr').each (i, row) ->
    $(row).find('input[name*="["]').each (_, elt) ->
      elt = $(elt)
      elt.attr 'name', elt.attr('name').replace(/\[\d+\]/, "[#{i}]")

ajaxPersist = (set, url) ->
  # jQuery#map will return a jQuery set, not an actual array.  This will b0rk Ajax's data, so
  # use the classic [x...] trick to convert into an actual Array.
  ids = [(set.find('tr[data-id]').map -> $(@).attr('data-id'))...]
  $.ajax url, data: { ids, _method: 'PUT' }, type: 'POST'

initSortables = ->
  set = $('table.sortable tbody')
  set.sortable axis: 'y', cursor: 'ns-resize'
  set.on 'sortupdate', ->
    url = $(@).closest('table').attr(PERSIST_URL_ATTR)
    if url
      ajaxPersist set, url
    else
      adjustFields set

# This feels so CLI! :-D
$ initSortables
