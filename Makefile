.PHONY: generate regenerate-supply validate validate-parquet

generate:
	PYTHONPATH=.vendor python generator/generate_world.py

regenerate-supply:
	PYTHONPATH=.vendor python generator/regenerate_supply.py

validate:
	PYTHONPATH=.vendor python generator/validate_world.py

validate-parquet:
	PYTHONPATH=.vendor python generator/validate_parquet_compatibility.py --scope all --report
