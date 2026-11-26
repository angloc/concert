"""Shared test configuration: a skipped test fails the run."""

import pytest


@pytest.hookimpl(trylast=True)
def pytest_sessionfinish(session, exitstatus):
    """Fail the session when any test was skipped; a skip is never a pass."""
    reporter = session.config.pluginmanager.get_plugin("terminalreporter")
    if reporter is not None and reporter.stats.get("skipped"):
        reporter.write_line("skipped tests fail the run", red=True)
        session.exitstatus = pytest.ExitCode.TESTS_FAILED
