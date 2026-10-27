#!/usr/bin/env bash
# Turns a clean loopback recording into the alarm file (assets/sounds/gentle.caf).
# Usage: bash scripts/sound/master-alarm.sh <raw-float.wav> <song-end-seconds>
# Example: bash scripts/sound/master-alarm.sh ../recordings/my-take-float32.wav 32.78
set -euo pipefail
RAW="$1"; END="$2"; FADE_START=$(python -c "print(round($END-0.58,2))")
TMP=$(mktemp -d)
# 1. Cut at the true end of the song, short fade, light treble lift, gentle compression, safety limiter.
ffmpeg -y -v error -i "$RAW" -af "atrim=0:$END,afade=t=out:st=$FADE_START:d=0.58,highshelf=f=9000:g=2,acompressor=threshold=-16dB:ratio=1.6:attack=20:release=300:makeup=1.6,alimiter=limit=0.89:attack=2:release=80:level=false" -ar 44100 -c:a pcm_s16le "$TMP/once.wav"
# 2. Play it back to back with a 0.8s breath to fill 90 seconds (same length as the old alarm), fade the last 2s.
ffmpeg -y -v error -f lavfi -t 0.8 -i anullsrc=r=44100:cl=stereo -i "$TMP/once.wav" -filter_complex "[1:a][0:a][1:a][0:a][1:a]concat=n=5:v=0:a=1,atrim=0:90,afade=t=out:st=88:d=2" -c:a pcm_s16le "$TMP/alarm.wav"
# 3. Convert to CAF for iOS.
ffmpeg -y -v error -i "$TMP/alarm.wav" -c:a pcm_s16le -f caf "$(dirname "$0")/../../assets/sounds/gentle.caf"
ffmpeg -hide_banner -i "$TMP/alarm.wav" -af volumedetect -f null - 2>&1 | grep -E "mean_volume|max_volume"
echo "Wrote assets/sounds/gentle.caf. Native asset: needs a new TestFlight build, not OTA."
