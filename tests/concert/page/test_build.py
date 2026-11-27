"""Page assembly: one self-contained page that shows its version."""

from html.parser import HTMLParser

from concert.page import build


class VersionText(HTMLParser):
    """Collects the text of the element with id="version"."""

    def __init__(self):
        super().__init__()
        self.depth, self.text = 0, ""

    def handle_starttag(self, tag, attrs):
        if self.depth or dict(attrs).get("id") == "version":
            self.depth += 1

    def handle_endtag(self, tag):
        if self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if self.depth:
            self.text += data


def test_page_shows_the_version_it_was_built_with(tmp_path):
    """--version is shown verbatim as text in the page shell."""
    out = tmp_path / "page.html"
    build.main(["--light", "--version", "1.2.3-rc.1", "--out", str(out)])
    parser = VersionText()
    parser.feed(out.read_text())
    assert parser.text.strip() == "1.2.3-rc.1"
