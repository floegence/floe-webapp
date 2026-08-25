.PHONY: check install flowersec-smoke-peer lint typecheck test build verify

# Local CI entrypoint.
# Keep it deterministic (no watch mode) so it can be used in automation.
check: install flowersec-smoke-peer lint typecheck test build verify

install:
	pnpm install --frozen-lockfile

flowersec-smoke-peer:
	cd scripts/flowersec-v3-smoke-peer && GOWORK=off go test ./... && GOWORK=off go vet ./...

lint:
	pnpm lint

typecheck:
	pnpm typecheck

test:
	pnpm test -- --run

build:
	pnpm build

verify:
	pnpm verify
