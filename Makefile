.PHONY: check lint typecheck test build verify

# Local CI entrypoint.
# Keep it deterministic (no watch mode) so it can be used in automation.
check: lint typecheck test build verify

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
