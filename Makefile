.DEFAULT_GOAL := start
.PHONY: help init start s S dev check build format
help:
	@echo "make/start/s/S: install, build and run; dev: development; init: dependencies; check: types, tests, format; build: production assets; format: Prettier"
init:
	node scripts/start.ts --init
start s S:
	node scripts/start.ts --production
dev:
	node scripts/start.ts
check:
	npm run check
build:
	npm run build
format:
	npm run format
