.PHONY: install check test build format
.DEFAULT_GOAL := check

install:
	cd site && npm ci

# Fast checks that need no emulators or browsers; CI runs the full set (.github/workflows/site-ci.yml).
check:
	cd api && test -z "$$(gofmt -l .)" && go vet ./... && go test ./...
	cd site && npm run typecheck && npm test

test: check
	cd site && npm run test:e2e

build:
	cd site && npm run build

format:
	cd api && gofmt -w .
