'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

// Voice names to try in order of preference.
// Chrome ships "Google 日本語" — a cloud-backed neural voice that's free and natural.
// Edge ships Microsoft neural voices with similar quality.
// macOS Kyoko/O-Ren are decent system voices as a last resort.
const PREFERRED_VOICE_NAMES = [
  'Google 日本語',
  'Google Japanese',
  'Microsoft Nanami', // Edge: ja-JP-NanamiNeural
  'Microsoft Keita', // Edge: ja-JP-KeitaNeural
  'O-Ren', // macOS enhanced
  'Kyoko', // macOS standard
];

// Resolved once voices are available; shared across all hook instances so
// multiple speak() calls before voices load don't clobber each other.
let voicesReady: Promise<void> | null = null;

function waitForVoices(): Promise<void> {
  if (voicesReady) return voicesReady;
  voicesReady = new Promise((resolve) => {
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
    } else {
      const handler = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', handler);
        resolve();
      };
      window.speechSynthesis.addEventListener('voiceschanged', handler);
    }
  });
  return voicesReady;
}

function getBestJapaneseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const jp = voices.filter((v) => v.lang.startsWith('ja'));
  if (!jp.length) return null;

  for (const name of PREFERRED_VOICE_NAMES) {
    const match = jp.find((v) => v.name.includes(name));
    if (match) return match;
  }

  return jp[0];
}

export type VoiceStatus = 'checking' | 'ready' | 'unavailable';

/** Give the browser this long to populate its voice list before giving up. */
const VOICE_WAIT_MS = 3000;

/**
 * iOS/iPadOS ignores speechSynthesis.speak() unless the call originates from a
 * user gesture, so listening practice cannot auto-play the first question there.
 * iPadOS reports a desktop UA string, hence the touch check.
 */
export function speechNeedsGesture(): boolean {
  if (typeof navigator === 'undefined' || typeof document === 'undefined') return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (ua.includes('Macintosh') && 'ontouchend' in document);
}

/**
 * Whether this device can actually speak Japanese, for modes that are useless
 * without it (Listen). Voices load asynchronously, so this starts as 'checking'.
 */
export function useJapaneseVoice(): VoiceStatus {
  const [status, setStatus] = useState<VoiceStatus>('checking');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setStatus('unavailable');
      return;
    }
    let cancelled = false;
    const settle = () => {
      if (!cancelled) setStatus(getBestJapaneseVoice() ? 'ready' : 'unavailable');
    };
    // Browsers with no voices at all never fire 'voiceschanged', so cap the wait
    // rather than leaving the mode stuck on its loading screen forever.
    const timer = setTimeout(settle, VOICE_WAIT_MS);
    waitForVoices().then(() => {
      clearTimeout(timer);
      settle();
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, []);

  return status;
}

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== 'undefined') window.speechSynthesis.cancel();
    setSpeaking(false);
  }, []);

  const speak = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);

    const trySpeak = () => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      const voice = getBestJapaneseVoice();
      if (voice) utterance.voice = voice;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    };

    waitForVoices().then(trySpeak);
  }, []);

  // Speak multiple texts in sequence. The Web Speech API queues utterances
  // naturally — we queue them all at once and only clear speaking when the
  // last one finishes (or on error).
  const speakAll = useCallback((texts: string[]) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const filtered = texts.filter(Boolean);
    if (!filtered.length) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);

    const trySpeak = () => {
      const voice = getBestJapaneseVoice();
      filtered.forEach((text, i) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.9;
        if (voice) utterance.voice = voice;
        if (i === 0) utterance.onstart = () => setSpeaking(true);
        if (i === filtered.length - 1) {
          utterance.onend = () => setSpeaking(false);
          utterance.onerror = () => setSpeaking(false);
        }
        utteranceRef.current = utterance;
        window.speechSynthesis.speak(utterance);
      });
    };

    waitForVoices().then(trySpeak);
  }, []);

  return { speak, speakAll, stop, speaking };
}
