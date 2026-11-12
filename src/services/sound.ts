import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export type SoundType = 'chime' | 'beep' | 'radar';

let nativePlayer: any = null;

// Initialize native audio player lazily
async function getNativePlayer() {
  if (Platform.OS === 'web') return null;
  if (!nativePlayer) {
    try {
      const { createAudioPlayer } = await import('expo-audio');
      // Load local beep.wav asset
      nativePlayer = createAudioPlayer(require('@/assets/sounds/beep.wav'));
    } catch (e) {
      console.warn('Could not initialize native audio player:', e);
    }
  }
  return nativePlayer;
}

/**
 * Web Audio API synthesizer for crisp, instant beep sounds that stop automatically
 */
function playWebSynthesizedBeep(type: SoundType) {
  if (typeof window === 'undefined') return;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    if (type === 'beep') {
      // Single clean 880Hz beep (220ms)
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } else if (type === 'radar') {
      // Double quick ping (950Hz)
      const playPing = (startTime: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, startTime);
        gain.gain.setValueAtTime(0.28, startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.1);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.1);
      };
      playPing(now);
      playPing(now + 0.13);
    } else {
      // Default: Dual-tone chime (880Hz -> 1320Hz, ~380ms total)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.32, now);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.15);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.16);
      gain2.gain.setValueAtTime(0.32, now + 0.16);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.16);
      osc2.stop(now + 0.42);
    }

    // Auto close context after sound finishes to free resources
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 600);
  } catch (err) {
    console.warn('Error playing web beep:', err);
  }
}

/**
 * Play a short alert beep and automatically stop.
 * Also triggers haptic feedback.
 */
export async function playBeepSound(type: SoundType = 'chime') {
  // Trigger tactile haptic feedback
  try {
    if (Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  } catch {
    // Haptics might not be supported on all devices
  }

  // Play sound
  if (Platform.OS === 'web') {
    playWebSynthesizedBeep(type);
  } else {
    try {
      const player = await getNativePlayer();
      if (player) {
        player.seekTo(0);
        player.play();
        // Guaranteed safety cutoff so sound never loops or goes on forever
        setTimeout(() => {
          try {
            if (player.playing) {
              player.pause();
            }
          } catch {
            // Ignore error if already stopped
          }
        }, 800);
      }
    } catch (e) {
      console.warn('Failed to play native beep:', e);
    }
  }
}

