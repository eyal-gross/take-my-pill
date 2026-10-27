#!/usr/bin/env bash
# Regenerates assets/sounds/gentle.caf — the "Gentle" alarm sound.
# Chosen by Eyal on Oct 21, 2026: warm flute "tu-tu" every 2.8 s, soft attack, short decay.
# AlarmKit does not loop custom sounds, so the pattern is baked into a 90-second file.
# Requires ffmpeg. Output: 44.1 kHz, mono, 16-bit PCM in a CAF container (what iOS expects).
set -euo pipefail
cd "$(dirname "$0")/.."
W='0.52*sin(2*PI*440*t+0.4*sin(2*PI*5.5*t))+0.06*sin(2*PI*880*t)'
ffmpeg -y -loglevel error -f lavfi \
  -i "aevalsrc='($W)*min(1,mod(t,2.8)/0.08)*exp(-9*mod(t,2.8)) + gte(mod(t,2.8),0.32)*($W)*min(1,(mod(t,2.8)-0.32)/0.08)*exp(-7*(mod(t,2.8)-0.32))':s=44100:d=90" \
  -af "lowpass=f=1400,afade=t=out:st=88:d=2" \
  -ac 1 -c:a pcm_s16le -f caf assets/sounds/gentle.caf
echo "wrote assets/sounds/gentle.caf"
