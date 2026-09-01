.PHONY: generate validate

generate:
	PYTHONPATH=.vendor python generator/generate_world.py

validate:
	PYTHONPATH=.vendor python generator/validate_world.py
