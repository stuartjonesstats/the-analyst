.PHONY: generate regenerate-supply validate

generate:
	PYTHONPATH=.vendor python generator/generate_world.py

regenerate-supply:
	PYTHONPATH=.vendor python generator/regenerate_supply.py

validate:
	PYTHONPATH=.vendor python generator/validate_world.py
