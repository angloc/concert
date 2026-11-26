# Python profile

- Format and lint: `ruff format --check`, `ruff check`.
- Test: `pytest` with `pytest-timeout` at 60 seconds per test.
- Skipped tests: the pytest summary reports skipped tests.
- Coverage: coverage.py with `fail_under`, with subprocess measurement enabled for end-to-end tests. Platform-specific modules are listed under `omit` in the coverage configuration.
- Platform selection: pytest markers, deselected with `-m`.
- Vulnerabilities: `pip-audit`.
- Environment: `uv` with a committed lock file.
- Code: `src/<package>/` with one subpackage for each module, named for the decision that the module hides. Entry points are thin: a console script that calls one function of a module. Public modules, classes and functions have docstrings (PEP 257) that state the current purpose, and public interfaces carry type hints. Tests live in `tests/` and mirror the layout of `src/`. Shared fixtures live in `conftest.py`: `tmp_path` for files, and a wider fixture scope for expensive setup that tests share.
- Install: the base image is the official `python` image. `install` reads `Makefile`, `pyproject.toml` and `uv.lock`. `install` installs `uv` at the pinned version and runs `uv sync --locked --no-install-project`.
- Version mapping: the application version is the tag without the leading `v`, verbatim. The package metadata and the wheel file name carry the PEP 440 normalisation (`v1.2.3-rc.1` becomes `1.2.3rc1`). `pyproject.toml` declares the version dynamic and carries no version; the build backend takes the package version from `VERSION_TAG`, through a configured version hook. The same hook writes the application version, verbatim, to a generated module that the application reports.
