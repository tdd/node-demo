all: install doc start

install:
	npm install
	@echo 'Configure your app/back/credentials.json and app/front/credentials.json.'
	@echo 'Then you can start'

doc:
	@rm -f docs/*.html docs/docco.css
	@echo "Docc'ing the back…"
	@find -E app/back -type f -iregex '.+\.(js|coffee)' | xargs docco 2>&1 | sed 's@docs/@docs/back/@'
	@mkdir -p docs/back
	@mv docs/*.{css,html} docs/back/

	@echo "Docc’ing the front…"
	@find -E app/front -type f -iregex '.+\.(js|coffee)' | xargs docco 2>&1 | sed 's@docs/@docs/front/@'
	@mkdir -p docs/front/
	@mv docs/*.{css,html} docs/front/

	@echo "Docc’ing the core…"
	@docco app{,/client,/models}/*.{js,coffee} config.coffee

start:
	npm start

test:
	npm test
