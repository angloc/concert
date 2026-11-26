"""The film export: drawings from a headless browser, encoded by ffmpeg with the song."""

import imageio_ffmpeg
import pytest

from concert.capture import record

from .conftest import streams


def test_record_writes_1080p_h264_at_24fps_with_aac_song(tmp_path, song):
    """Two drawings at 12 a second become four 24 fps frames of 1920x1080 H.264, muxed with AAC."""
    out = tmp_path / "film.mp4"
    record.main([str(out), str(song), "--from", "0", "--to", str(2 / 12)])
    video, audio = streams(out)
    assert (
        "h264" in video
        and "1920x1080" in video
        and "24 fps" in video
        and "yuv420p" in video
    )
    assert "aac" in audio
    frames, secs = imageio_ffmpeg.count_frames_and_secs(str(out))
    assert frames == 4
    assert abs(secs - 2 / 12) < 0.05


def test_record_fails_clearly_when_ffmpeg_cannot_read_the_song(tmp_path):
    """A song ffmpeg cannot open stops the export with ffmpeg's exit status, not a broken pipe."""
    with pytest.raises(SystemExit, match="ffmpeg failed"):
        record.main(
            [
                str(tmp_path / "film.mp4"),
                str(tmp_path / "missing.flac"),
                "--to",
                "1",
            ]
        )
