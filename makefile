.PHONY: serve pretty

serve:
	cd docs && python -m http.server

pretty:
	npx js-beautify -r docs/*
