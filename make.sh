#!/bin/sh
# Everything from nothing: score -> performance -> voice -> band -> mix -> FLAC -> one HTML file.
# Needs Python 3 (made on 3.13) and nothing else. A few minutes on a laptop; every step uses at most two processes.
set -e
cd "$(dirname "$0")"
python3 music/perform.py
python3 tools/mktimeline.py
python3 voice/sing.py --all --persona --out build/voice.wav
python3 band/render.py
python3 mix/mix.py build/voice.wav -o build/mix.wav
python3 mix/flac.py build/mix.wav build/song.flac --requant --max-bytes 9000000
python3 tools/build.py
echo "open dist/bide.html"
