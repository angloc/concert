"""Version mapping of the Python profile, shared by the tag check and the build backend.

The application version is the tag without the leading v, verbatim. The package version is its PEP 440
normalisation. The build backend runs this file on its own, so it imports nothing from the package.
"""

import os
import re

from packaging.version import Version

TAG = re.compile(
    r"^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-rc\.[1-9][0-9]*)?$"
)


def application_version(tag: str) -> str | None:
    """The application version for a tag in the restricted SemVer format, or None."""
    return tag[1:] if TAG.fullmatch(tag) else None


def package_version(application: str) -> str:
    """The PEP 440 normalisation of an application version."""
    return str(Version(application))


PACKAGE_VERSION = package_version(
    application_version(os.environ.get("VERSION_TAG", "v0.0.0")) or "0.0.0"
)
