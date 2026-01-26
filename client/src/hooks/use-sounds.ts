import { useCallback, useEffect, useRef } from 'react';

type SoundType = 'success' | 'error' | 'click' | 'achievement' | 'levelUp' | 'xp' | 'streak' | 'heartLoss' | 'crystal' | 'star' | 'mastery' | 'practiceCorrect' | 'practiceError' | 'medal' | 'goldenTransform' | 'modalOpen' | 'stageComplete' | 'lessonComplete';

const SOUND_ENABLED_KEY = 'emaus-vota-sounds-enabled';

const frequencies: Record<SoundType, number[]> = {
  success: [523.25, 659.25, 783.99],
  error: [311.13, 233.08],
  click: [800],
  achievement: [523.25, 659.25, 783.99, 1046.50],
  levelUp: [392, 523.25, 659.25, 783.99, 1046.50],
  xp: [698.46, 880],
  streak: [440, 554.37, 659.25],
  heartLoss: [349.23, 261.63],
  crystal: [659.25, 830.61, 987.77, 1318.51],
  star: [587.33, 783.99, 987.77],
  mastery: [523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51],
  practiceCorrect: [523.25, 783.99, 1046.50],
  practiceError: [392, 293.66],
  medal: [659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98],
  goldenTransform: [392, 523.25, 659.25, 783.99, 987.77, 1174.66, 1318.51, 1567.98],
  modalOpen: [440, 554.37, 698.46],
  stageComplete: [523.25, 659.25, 783.99, 880],
  lessonComplete: [392, 523.25, 659.25, 783.99, 987.77, 1174.66]
};

const durations: Record<SoundType, number> = {
  success: 0.15,
  error: 0.2,
  click: 0.05,
  achievement: 0.2,
  levelUp: 0.15,
  xp: 0.1,
  streak: 0.12,
  heartLoss: 0.25,
  crystal: 0.18,
  star: 0.15,
  mastery: 0.25,
  practiceCorrect: 0.12,
  practiceError: 0.18,
  medal: 0.3,
  goldenTransform: 0.35,
  modalOpen: 0.12,
  stageComplete: 0.18,
  lessonComplete: 0.25
};

export function vibrate(pattern: number | number[] = 50): void {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (error) {
    console.log('[Vibration] Unable to vibrate:', error);
  }
}

export function vibrateError(): void {
  vibrate([100, 50, 100]);
}

export function useSounds() {
  const audioContextRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef<boolean>(true);

  useEffect(() => {
    const stored = localStorage.getItem(SOUND_ENABLED_KEY);
    enabledRef.current = stored !== 'false';
  }, []);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback((frequency: number, duration: number, startTime: number, volume: number = 0.3) => {
    const ctx = getAudioContext();
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    
    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }, [getAudioContext]);

  const playSound = useCallback((type: SoundType) => {
    if (!enabledRef.current) return;
    
    try {
      const ctx = getAudioContext();
      
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const freqs = frequencies[type];
      const duration = durations[type];
      const now = ctx.currentTime;
      
      freqs.forEach((freq, index) => {
        const delay = index * (duration * 0.8);
        playTone(freq, duration, now + delay, type === 'click' ? 0.1 : 0.25);
      });
    } catch (error) {
      console.log('[Sounds] Unable to play sound:', error);
    }
  }, [getAudioContext, playTone]);

  const toggleSounds = useCallback((enabled?: boolean) => {
    const newValue = enabled !== undefined ? enabled : !enabledRef.current;
    enabledRef.current = newValue;
    localStorage.setItem(SOUND_ENABLED_KEY, String(newValue));
    return newValue;
  }, []);

  const isSoundEnabled = useCallback(() => {
    return enabledRef.current;
  }, []);

  return {
    playSound,
    toggleSounds,
    isSoundEnabled,
    sounds: {
      success: () => playSound('success'),
      error: () => playSound('error'),
      click: () => playSound('click'),
      achievement: () => playSound('achievement'),
      levelUp: () => playSound('levelUp'),
      xp: () => playSound('xp'),
      streak: () => playSound('streak'),
      heartLoss: () => playSound('heartLoss'),
      crystal: () => playSound('crystal'),
      star: () => playSound('star'),
      mastery: () => playSound('mastery'),
      practiceCorrect: () => playSound('practiceCorrect'),
      practiceError: () => playSound('practiceError'),
      medal: () => playSound('medal'),
      goldenTransform: () => playSound('goldenTransform'),
      modalOpen: () => playSound('modalOpen'),
      stageComplete: () => playSound('stageComplete'),
      lessonComplete: () => playSound('lessonComplete')
    },
    vibrate,
    vibrateError
  };
}

export function SoundToggle() {
  const { toggleSounds, isSoundEnabled, sounds } = useSounds();
  
  const handleToggle = () => {
    const newState = toggleSounds();
    if (newState) {
      sounds.click();
    }
  };
  
  return {
    isEnabled: isSoundEnabled(),
    toggle: handleToggle
  };
}
