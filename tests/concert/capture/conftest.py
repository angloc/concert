"""Shared capture fixtures: a short song to mux, and a way to read what ffmpeg sees in a file."""

import re
import subprocess

import imageio_ffmpeg
import pytest


@pytest.fixture(scope="session")
def song(tmp_path_factory):
    """A 2-second stereo FLAC tone, standing in for the build's song."""
    path = tmp_path_factory.mktemp("song") / "song.flac"
    subprocess.run(
        [
            imageio_ffmpeg.get_ffmpeg_exe(),
            "-loglevel",
            "error",
            "-f",
            "lavfi",
            "-i",
            "sine=f=440:d=2",
            "-ac",
            "2",
            str(path),
        ],
        check=True,
    )
    return path


def streams(path):
    """The stream lines that ffmpeg prints for a media file."""
    out = subprocess.run(
        [imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-i", str(path)],
        check=False,
        capture_output=True,
        text=True,
    )
    return [
        line.strip()
        for line in out.stderr.splitlines()
        if re.match(r"\s*Stream #", line)
    ]
