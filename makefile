.PHONY: serve pretty

serve:
	cd docs && python -m http.server

pretty:
	find docs -type f \( -name "*.html" -or -name "*.js" \) | xargs -n1 npx js-beautify -r
