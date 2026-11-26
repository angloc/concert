# Tool pins. The ecosystem pins (.python-version, pyproject.toml and uv.lock) are not repeated here.
UV_VERSION := 0.13.10

VERSION_TAG ?= v0.0.0
VERSION     := $(VERSION_TAG:v%=%)
DIST        := dist
BUILD       := build
UV          := uv run --locked

SHELL := bash
.SHELLFLAGS := -euo pipefail -c
.DEFAULT_GOAL := verify
.PHONY: install verify package test fmt docs-check

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

# verify is the check to run before finishing any change. It never rewrites
# tracked files. The coverage floor is fail_under in pyproject.toml.
verify:
	$(UV) ruff format --check
	$(UV) ruff check
	$(UV) pip-audit --skip-editable --progress-spinner off
	$(MAKE) test
	$(UV) coverage combine --quiet
	$(UV) coverage report
	$(MAKE) docs-check

# package builds every deliverable once, into dist/: the score is performed,
# sung, played, mixed, encoded and assembled into one page.
package:
	rm -rf $(DIST)
	mkdir -p $(DIST) $(BUILD)
	$(UV) python music/perform.py
	$(UV) python tools/mktimeline.py
	$(UV) python voice/sing.py --all --persona --out $(BUILD)/voice.wav
	$(UV) python band/render.py
	$(UV) python mix/mix.py $(BUILD)/voice.wav -o $(BUILD)/mix.wav
	$(UV) python mix/flac.py $(BUILD)/mix.wav $(BUILD)/song.flac --requant --max-bytes 9000000
	$(UV) python tools/build.py --out $(BUILD)/bide.html
	cp $(BUILD)/bide.html $(DIST)/bide_$(VERSION).html
	@if [ -n "$$(ls -A $(DIST))" ]; then (cd $(DIST) && find . -type f ! -name SHA256SUMS -printf '%P\n' | LC_ALL=C sort | xargs -d '\n' sha256sum -- > SHA256SUMS); fi

# test packages, then runs every test under coverage with the timeout of the
# Python profile. A skipped test fails the run (tests/conftest.py).
test: package
	rm -f .coverage .coverage.*
	$(UV) coverage run -m pytest -p no:cacheprovider

fmt:
	$(UV) ruff format

docs-check:
	$(UV) doccheck . $(DIST) --version $(VERSION)
