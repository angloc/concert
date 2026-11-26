"""The built page, end to end, in Chromium, Firefox and WebKit."""

import time


def clock(t):
    """A time as the player announces it, minutes:seconds."""
    m, s = divmod(round(t), 60)
    return f"{m}:{s:02d}"


def test_page_plays_offline_without_errors(visit):
    """Loading and playing make no network request and log no error."""
    visit.play()
    time.sleep(2)
    assert visit.remote() == []
    assert visit.errors == []


def test_song_decodes_to_the_sample_accurate_clock(visit):
    """The song decodes into an audio buffer as long as the film."""
    audio = visit.ev("BIDE.player.audio")
    assert audio["kind"] == "buffer"
    assert abs(audio["dur"] - visit.ev("BIDE.player.total")) < 0.05


def test_film_draws_and_changes_over_time(visit):
    """While playing, the sheet is drawn again and again, and the picture changes."""
    visit.play()
    first, drawn = (
        visit.page.screenshot(),
        visit.ev("BIDE.player.stats.drawn"),
    )
    time.sleep(3)
    assert visit.ev("BIDE.player.stats.drawn") > drawn
    assert visit.page.screenshot() != first


def test_keys_work_and_are_announced(visit):
    """Space, the arrows, M, R and F each act, and the live region says what happened."""
    visit.play()
    visit.page.keyboard.press("Space")
    visit.live("Paused")
    start = visit.ev("BIDE.player.time()")
    visit.page.keyboard.press("ArrowRight")
    assert abs(visit.ev("BIDE.player.time()") - (start + 5)) < 0.5
    visit.live(clock(start + 5))
    visit.page.keyboard.press("ArrowLeft")
    visit.live(clock(start))
    visit.page.keyboard.press("m")
    visit.live("Muted")
    assert visit.ev("BIDE.player.muted")
    visit.page.keyboard.press("m")
    visit.live("Sound on")
    visit.page.keyboard.press("Space")
    visit.live("Playing")
    visit.page.keyboard.press("r")
    visit.live("From the start")
    assert visit.ev("BIDE.player.time()") < 2
    visit.page.keyboard.press("f")
    visit.live("Full screen")
    assert visit.ev("!!document.fullscreenElement")


def test_page_shows_its_version(visit, built):
    """The version in the file name is shown on the page."""
    shown = visit.page.locator("#version")
    assert shown.is_visible()
    assert shown.inner_text().strip() == built[1]
