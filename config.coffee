exports.config =
  # See https://github.com/brunch/brunch/blob/stable/docs/config.md for documentation.
  paths:
    watched: ['app/back/client', 'app/front/client', 'app/front/views', 'vendor']
    public: 'public'
  files:
    javascripts:
      joinTo:
        'back.js': /^app\/back\/client/
        'front.js': /^app\/front\/client/
        'vendor.js': /^vendor/
      order:
        before: [
          'vendor/scripts/jquery-2.0.3.js',
          'vendor/scripts/underscore-1.5.2.js'
        ]

    stylesheets:
      joinTo: 'app.css'
      order:
        before: [
          'vendor/styles/bootstrap.min.css'
        ]

    templates:
      joinTo: 'front.js'
  # optimize: true
