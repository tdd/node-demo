exports.config =
  # See http://brunch.readthedocs.org/en/latest/config.html for documentation.
  paths:
    public: 'public'
  files:
    javascripts:
      joinTo:
        'app.js': /^app/
        'vendor.js': /^vendor/
      order:
        before: [
          'vendor/scripts/jquery-2.0.3.js',
          'vendor/scripts/underscore-1.5.2.js'
        ]

    stylesheets:
      joinTo: 'app.css'
      order:
        before: ['vendor/styles/bootstrap/bootstrap.css']

    templates:
      joinTo: 'app.js'
  # optimize: true
