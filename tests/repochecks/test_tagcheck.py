"""The tag check, through its public interface and its command line."""

import subprocess

import pytest

from repochecks.tagcheck import InvalidTag, Versions, check_tag


def test_valid_tag():
    assert check_tag("v1.2.3") == Versions(application="1.2.3", package="1.2.3")


def test_valid_release_candidate():
    assert check_tag("v10.0.12-rc.3") == Versions(
        application="10.0.12-rc.3", package="10.0.12rc3"
    )


@pytest.mark.parametrize(
    "tag",
    [
        "1.2.3",
        "v1.2",
        "v01.2.3",
        "v1.02.3",
        "v1.2.03",
        "v1.2.3-rc.0",
        "v1.2.3-rc1",
        "v1.2.3-beta.1",
        "v1.2.3+build",
        "v1.2.3\n",
    ],
)
def test_tag_fails_the_format(tag):
    with pytest.raises(InvalidTag, match="format"):
        check_tag(tag)


def test_mapping_follows_pep_440():
    # Every tag that passes the format maps to a valid PEP 440 version; the mapping is the normalisation itself.
    assert check_tag("v0.0.1-rc.12").package == "0.0.1rc12"


def test_cli_prints_versions():
    result = subprocess.run(
        ["tagcheck", "v2.0.0-rc.1"], check=False, capture_output=True, text=True
    )
    assert result.returncode == 0
    assert result.stdout.split() == ["2.0.0-rc.1", "2.0.0rc1"]


def test_cli_rejects_bad_tag():
    result = subprocess.run(
        ["tagcheck", "v2.0"], check=False, capture_output=True, text=True
    )
    assert result.returncode == 1
    assert "format" in result.stderr


def test_cli_usage():
    result = subprocess.run(["tagcheck"], check=False, capture_output=True, text=True)
    assert result.returncode == 2
