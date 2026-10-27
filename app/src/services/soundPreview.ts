import type { AudioPlayer } from 'expo-audio';
import type { SoundChoice } from '../store/useAppStore';
import { capabilities } from './capabilities';

/**
 * 15-second previews for Settings. "Normal" has no file: iOS only plays it as a real alarm
 * (see previewAlarm.ts). expo-audio is required lazily so an older build without the native
 * module can never crash on import.
 */
const CLIPS: Partial<Record<SoundChoice, number>> = {
  // The "Song" preview (song-preview.m4a) is a private recording and is not in the public repo.
  // Drop your own 15s clip into assets/sounds/previews/ and add: gentle: require('.../song-preview.m4a')
  tone: require('../../assets/sounds/previews/gentle-preview.m4a'),
};

let player: AudioPlayer | null = null;
let current: SoundChoice | null = null;
let modeSet = false;

function audio(): typeof import('expo-audio') | null {
  if (!capabilities.soundPreview) return null;
  try {
    return require('expo-audio');
  } catch {
    return null;
  }
}

export function stopPreview(): void {
  if (player) {
    try {
      player.pause();
      player.remove();
    } catch {}
  }
  player = null;
  current = null;
}

/** Plays the clip for `sound`. `onEnd` runs when it finishes by itself. Returns false if nothing plays. */
export function playPreview(sound: SoundChoice, onEnd: () => void): boolean {
  stopPreview();
  const lib = audio();
  const clip = CLIPS[sound];
  if (!lib || clip === undefined) return false;
  if (!modeSet) {
    modeSet = true;
    // Play even with the ring/silent switch on: it's a preview of an alarm.
    lib.setAudioModeAsync({ playsInSilentMode: true }).catch(() => undefined);
  }
  const p = lib.createAudioPlayer(clip);
  player = p;
  current = sound;
  p.addListener('playbackStatusUpdate', (status) => {
    if (status.didJustFinish && player === p) {
      stopPreview();
      onEnd();
    }
  });
  p.play();
  return true;
}

export const previewPlaying = () => current;
