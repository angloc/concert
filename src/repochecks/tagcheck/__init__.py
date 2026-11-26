"""Release tag rules: the tag format and the version mapping of the Python profile."""

import sys
from typing import NamedTuple

from .version import application_version, package_version


class InvalidTag(ValueError):
    """A tag that breaks the tag format or the version mapping."""


class Versions(NamedTuple):
    """The versions a valid tag maps to."""

    application: str
    package: str


def check_tag(tag: str) -> Versions:
    """Return the versions for a valid tag, or raise InvalidTag."""
    application = application_version(tag)
    if application is None:
        raise InvalidTag(f"{tag!r} breaks the tag format vMAJOR.MINOR.PATCH[-rc.N]")
    return Versions(application, package_version(application))


def main(argv: list[str] | None = None) -> int:
    """Command-line entry point: tagcheck TAG. Prints the application and package versions."""
    args = sys.argv[1:] if argv is None else argv
    if len(args) != 1:
        print("usage: tagcheck TAG", file=sys.stderr)
        return 2
    try:
        versions = check_tag(args[0])
    except InvalidTag as error:
        print(error, file=sys.stderr)
        return 1
    print(versions.application, versions.package)
    return 0
