# Tool pins. The ecosystem pins (.python-version, pyproject.toml and uv.lock) are not repeated here.
UV_VERSION := 0.13.10
# Node, the secondary toolchain, is pinned by .node-version and baseline/package-lock.json.
NODE_VERSION := $(shell cat .node-version)
NODE_DIR     := $(CURDIR)/.tools/node-v$(NODE_VERSION)-linux-x64
export PATH  := $(NODE_DIR)/bin:$(PATH)
SUDO         := $(shell [ "$$(id -u)" = 0 ] || echo sudo)

VERSION_TAG ?= v0.0.0
VERSION     := $(VERSION_TAG:v%=%)
DIST        := dist
BUILD       := build
UV          := uv run --locked

SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := verify
.PHONY: install verify package test fmt docs-check export

# install sets up the programs that the other targets call. It changes the
# machine, so it refuses to run outside a CI runner, a container or a
# dedicated virtual machine.
install:
	@if [ "$${CI:-}" != true ] && [ "$${DEDICATED_ENVIRONMENT:-}" != 1 ] && [ ! -e /.dockerenv ]; then \
		echo "install changes the machine. Run it in CI, in a container or in a dedicated virtual machine (set DEDICATED_ENVIRONMENT=1 there)."; \
		exit 1; \
	fi
	python3 -m pip install --disable-pip-version-check --quiet "uv==$(UV_VERSION)"
	uv sync --locked --no-install-project
	uv run --locked --no-install-project playwright install --with-deps chromium firefox webkit
	$(SUDO) apt-get install -y --no-install-recommends pulseaudio
	@if [ ! -x $(NODE_DIR)/bin/node ]; then \
		mkdir -p .tools && cd .tools && \
		curl -fsSLO https://nodejs.org/dist/v$(NODE_VERSION)/node-v$(NODE_VERSION)-linux-x64.tar.xz && \
		curl -fsSL https://nodejs.org/dist/v$(NODE_VERSION)/SHASUMS256.txt | grep " node-v$(NODE_VERSION)-linux-x64.tar.xz$$" | sha256sum -c - && \
		tar -xJf node-v$(NODE_VERSION)-linux-x64.tar.xz && rm node-v$(NODE_VERSION)-linux-x64.tar.xz; \
	fi
	npm ci --prefix baseline

# verify is the check to run before finishing any change. It never rewrites
# tracked files. The coverage floor is fail_under in pyproject.toml.
verify:
	$(UV) ruff format --check
	$(UV) ruff check
	$(UV) pip-audit --skip-editable --progress-spinner off
	cd baseline && npm exec --no -- prettier --check .
	cd baseline && npm exec --no -- eslint --max-warnings 0 eslint.config.js
	npm audit --prefix baseline
	$(MAKE) test
	$(UV) baselinecheck $(DIST)/bide_$(VERSION).html
	$(UV) coverage combine --quiet
	$(UV) coverage report
	$(MAKE) docs-check

# package builds every deliverable once, into dist/: the score is performed,
# sung, played, mixed, encoded and assembled into one page.
package:
	rm -rf $(DIST)
	mkdir -p $(DIST) $(BUILD)
	$(UV) concert-perform
	$(UV) concert-timeline
	$(UV) concert-sing --all --persona --out $(BUILD)/voice.wav
	$(UV) concert-band
	$(UV) concert-mix $(BUILD)/voice.wav -o $(BUILD)/mix.wav
	$(UV) concert-flac $(BUILD)/mix.wav $(BUILD)/song.flac --requant --max-bytes 9000000
	$(UV) concert-page --version $(VERSION) --out $(BUILD)/bide.html
	cp $(BUILD)/bide.html $(DIST)/bide_$(VERSION).html
	@if [ -n "$$(ls -A $(DIST))" ]; then (cd $(DIST) && find . -type f ! -name SHA256SUMS -printf '%P\n' | LC_ALL=C sort | xargs -d '\n' sha256sum -- > SHA256SUMS); fi

# test packages, then runs every test under coverage with the timeout of the
# Python profile. A skipped test fails the run (tests/conftest.py).
test: package
	rm -f .coverage .coverage.*
	$(UV) coverage run -m pytest -p no:cacheprovider

# export draws the whole film in headless Chromium and encodes it with the
# song as an MP4 in build/. It is slow without a GPU.
export: package
	$(UV) concert-record $(BUILD)/bide.mp4 $(BUILD)/song.flac

fmt:
	$(UV) ruff format

docs-check:
	$(UV) doccheck . $(DIST) --version $(VERSION)
