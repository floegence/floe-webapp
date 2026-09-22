.PHONY: check install flowersec-smoke-peer lint typecheck test build verify packed-consumer workbench-header persistent-scrollbar chat-media activity-navigation

# Local CI entrypoint.
# Keep it deterministic (no watch mode) so it can be used in automation.
check: install flowersec-smoke-peer lint typecheck test build verify packed-consumer workbench-header persistent-scrollbar chat-media activity-navigation input-history pdf asset-recovery resource-cache

install:
	pnpm install --frozen-lockfile

flowersec-smoke-peer:
	cd scripts/flowersec-smoke-peer && GOWORK=off go test ./... && GOWORK=off go vet ./...

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

packed-consumer:
	node scripts/verify-npm-release-consumer.mjs --packed

workbench-header:
	pnpm test:workbench-header

persistent-scrollbar:
	pnpm test:persistent-scrollbar

activity-navigation:
	pnpm test:activity-navigation

chat-media:
	node scripts/check-chat-media-browser.mjs

.PHONY: input-history
input-history:
	node scripts/check-input-history-browser.mjs

.PHONY: pdf
pdf:
	pnpm test:pdf

.PHONY: asset-recovery
asset-recovery:
	node scripts/check-asset-recovery-browser.mjs

.PHONY: resource-cache
resource-cache:
	node scripts/check-resource-cache-browser.mjs
