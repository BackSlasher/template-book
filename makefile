.PHONY: serve pretty

serve:
	python -m http.server

pretty:
	npx js-beautify -r docs/*
