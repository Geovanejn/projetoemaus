import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useCallback, useState } from "react";

interface FrozenFlameAnimationProps {
  isDefrosting: boolean;
  onDefrostComplete?: () => void;
}

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
      sharedAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
    return sharedAudioContext;
  } catch (e) {
    return null;
  }
}

export function FrozenFlameAnimation({ isDefrosting, onDefrostComplete }: FrozenFlameAnimationProps) {
  const hasPlayedSounds = useRef(false);
  const [defrostPhase, setDefrostPhase] = useState<'frozen' | 'melting' | 'free' | 'done'>('frozen');

  const playIceBreakSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext || audioContext.state !== 'running') return;

    try {
      const duration = 0.8;
      const oscillator1 = audioContext.createOscillator();
      const oscillator2 = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      const filter = audioContext.createBiquadFilter();
      
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(8000, audioContext.currentTime + duration);
      
      oscillator1.type = 'sawtooth';
      oscillator1.frequency.setValueAtTime(150, audioContext.currentTime);
      oscillator1.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + duration);
      
      oscillator2.type = 'square';
      oscillator2.frequency.setValueAtTime(300, audioContext.currentTime);
      oscillator2.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + duration);
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator1.connect(filter);
      oscillator2.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator1.start();
      oscillator2.start();
      oscillator1.stop(audioContext.currentTime + duration);
      oscillator2.stop(audioContext.currentTime + duration);
      
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          const crackOsc = audioContext.createOscillator();
          const crackGain = audioContext.createGain();
          crackOsc.type = 'square';
          crackOsc.frequency.setValueAtTime(1000 + Math.random() * 2000, audioContext.currentTime);
          crackGain.gain.setValueAtTime(0.2, audioContext.currentTime);
          crackGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
          crackOsc.connect(crackGain);
          crackGain.connect(audioContext.destination);
          crackOsc.start();
          crackOsc.stop(audioContext.currentTime + 0.1);
        }, i * 120);
      }
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  const playFireWhooshSound = useCallback(() => {
    const audioContext = getAudioContext();
    if (!audioContext || audioContext.state !== 'running') return;

    try {
      const duration = 1.2;
      
      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseSource = audioContext.createBufferSource();
      noiseSource.buffer = buffer;
      
      const filter = audioContext.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(200, audioContext.currentTime);
      filter.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.3);
      filter.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + duration);
      filter.Q.value = 2;
      
      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.4, audioContext.currentTime + 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      noiseSource.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      noiseSource.start();
      noiseSource.stop(audioContext.currentTime + duration);
      
      const crackle = audioContext.createOscillator();
      const crackleGain = audioContext.createGain();
      crackle.type = 'triangle';
      crackle.frequency.setValueAtTime(80, audioContext.currentTime);
      crackle.frequency.linearRampToValueAtTime(120, audioContext.currentTime + duration);
      crackleGain.gain.setValueAtTime(0.1, audioContext.currentTime);
      crackleGain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      crackle.connect(crackleGain);
      crackleGain.connect(audioContext.destination);
      crackle.start();
      crackle.stop(audioContext.currentTime + duration);
    } catch (e) {
      console.log('Audio not available');
    }
  }, []);

  useEffect(() => {
    if (isDefrosting && !hasPlayedSounds.current) {
      hasPlayedSounds.current = true;
      setDefrostPhase('melting');
      playIceBreakSound();
      
      const meltTimer = setTimeout(() => {
        setDefrostPhase('free');
        playFireWhooshSound();
      }, 2000);
      
      const doneTimer = setTimeout(() => {
        setDefrostPhase('done');
      }, 3500);
      
      const completeTimer = setTimeout(() => {
        onDefrostComplete?.();
      }, 4500);
      
      return () => {
        clearTimeout(meltTimer);
        clearTimeout(doneTimer);
        clearTimeout(completeTimer);
      };
    }
    if (!isDefrosting) {
      hasPlayedSounds.current = false;
      setDefrostPhase('frozen');
    }
  }, [isDefrosting, onDefrostComplete, playIceBreakSound, playFireWhooshSound]);

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="relative w-32 h-40 flex items-center justify-center">
        <AnimatePresence mode="wait">
          {!isDefrosting ? (
            <motion.div
              key="frozen"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.2 }}
              className="relative flex items-center justify-center"
            >
              <motion.div
                className="absolute inset-0 flex items-center justify-center"
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.8, 1, 0.8],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <svg viewBox="0 0 100 100" className="w-28 h-28">
                  <defs>
                    <linearGradient id="iceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
                      <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
                    </linearGradient>
                    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  
                  <motion.g filter="url(#glow)">
                    <motion.polygon
                      points="50,10 55,25 45,25"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                    />
                    <motion.polygon
                      points="50,10 65,35 55,25"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    />
                    <motion.polygon
                      points="50,10 35,35 45,25"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                    />
                    
                    <motion.polygon
                      points="15,45 30,50 25,55"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.1 }}
                    />
                    <motion.polygon
                      points="85,45 70,50 75,55"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }}
                    />
                    
                    <motion.polygon
                      points="25,80 40,75 35,85"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: 0.5 }}
                    />
                    <motion.polygon
                      points="75,80 60,75 65,85"
                      fill="url(#iceGradient)"
                      animate={{ opacity: [0.6, 0.9, 0.6] }}
                      transition={{ duration: 1.6, repeat: Infinity, delay: 0.7 }}
                    />
                  </motion.g>
                  
                  <motion.g filter="url(#glow)">
                    {[...Array(8)].map((_, i) => {
                      const angle = (i * 45) * Math.PI / 180;
                      const x1 = 50 + Math.cos(angle) * 20;
                      const y1 = 50 + Math.sin(angle) * 20;
                      const x2 = 50 + Math.cos(angle) * 35;
                      const y2 = 50 + Math.sin(angle) * 35;
                      return (
                        <motion.line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          stroke="#67e8f9"
                          strokeWidth="2"
                          strokeLinecap="round"
                          animate={{
                            opacity: [0.3, 0.7, 0.3],
                            strokeWidth: [1.5, 2.5, 1.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.15,
                          }}
                        />
                      );
                    })}
                  </motion.g>
                </svg>
              </motion.div>
              
              <motion.div
                className="relative z-10"
                animate={{
                  y: [0, -2, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <svg viewBox="0 0 60 80" className="w-16 h-20">
                  <defs>
                    <linearGradient id="flameGradientFrozen" x1="0%" y1="100%" x2="0%" y2="0%">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="40%" stopColor="#60a5fa" />
                      <stop offset="70%" stopColor="#93c5fd" />
                      <stop offset="100%" stopColor="#bfdbfe" />
                    </linearGradient>
                    <filter id="frozenGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <motion.path
                    d="M30 5 C35 25, 50 35, 50 50 C50 65, 40 75, 30 75 C20 75, 10 65, 10 50 C10 35, 25 25, 30 5 Z"
                    fill="url(#flameGradientFrozen)"
                    filter="url(#frozenGlow)"
                    animate={{
                      d: [
                        "M30 5 C35 25, 50 35, 50 50 C50 65, 40 75, 30 75 C20 75, 10 65, 10 50 C10 35, 25 25, 30 5 Z",
                        "M30 8 C33 22, 48 38, 48 52 C48 63, 38 73, 30 73 C22 73, 12 63, 12 52 C12 38, 27 22, 30 8 Z",
                        "M30 5 C35 25, 50 35, 50 50 C50 65, 40 75, 30 75 C20 75, 10 65, 10 50 C10 35, 25 25, 30 5 Z",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />
                  <motion.path
                    d="M30 25 C33 35, 40 40, 40 50 C40 58, 35 63, 30 63 C25 63, 20 58, 20 50 C20 40, 27 35, 30 25 Z"
                    fill="#dbeafe"
                    opacity={0.6}
                    animate={{
                      opacity: [0.4, 0.7, 0.4],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </svg>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="defrosting"
              initial={{ opacity: 1 }}
              className="relative flex items-center justify-center"
            >
              <svg viewBox="0 0 100 120" className="w-32 h-40">
                <defs>
                  <linearGradient id="iceShellGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a5f3fc" stopOpacity="0.95" />
                    <stop offset="50%" stopColor="#67e8f9" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.95" />
                  </linearGradient>
                  <linearGradient id="flameCold" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="40%" stopColor="#60a5fa" />
                    <stop offset="70%" stopColor="#93c5fd" />
                    <stop offset="100%" stopColor="#bfdbfe" />
                  </linearGradient>
                  <linearGradient id="flameWarm" x1="0%" y1="100%" x2="0%" y2="0%">
                    <stop offset="0%" stopColor="#dc2626" />
                    <stop offset="30%" stopColor="#ea580c" />
                    <stop offset="60%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                  <filter id="iceGlowDefrost" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="fireGlowDefrost" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>
                
                <motion.path
                  d="M50 10 C55 30, 70 40, 70 55 C70 75, 60 85, 50 85 C40 85, 30 75, 30 55 C30 40, 45 30, 50 10 Z"
                  fill={defrostPhase === 'frozen' || defrostPhase === 'melting' ? "url(#flameCold)" : "url(#flameWarm)"}
                  filter={defrostPhase === 'free' || defrostPhase === 'done' ? "url(#fireGlowDefrost)" : undefined}
                  animate={defrostPhase === 'free' || defrostPhase === 'done' ? {
                    d: [
                      "M50 8 C58 25, 75 38, 75 55 C75 78, 62 90, 50 90 C38 90, 25 78, 25 55 C25 38, 42 25, 50 8 Z",
                      "M50 12 C55 28, 68 42, 68 58 C68 72, 58 82, 50 82 C42 82, 32 72, 32 58 C32 42, 45 28, 50 12 Z",
                      "M50 8 C58 25, 75 38, 75 55 C75 78, 62 90, 50 90 C38 90, 25 78, 25 55 C25 38, 42 25, 50 8 Z",
                    ],
                    scale: [1, 1.05, 1],
                  } : {
                    d: [
                      "M50 10 C55 30, 70 40, 70 55 C70 75, 60 85, 50 85 C40 85, 30 75, 30 55 C30 40, 45 30, 50 10 Z",
                      "M50 12 C53 28, 68 42, 68 57 C68 73, 58 83, 50 83 C42 83, 32 73, 32 57 C32 42, 47 28, 50 12 Z",
                      "M50 10 C55 30, 70 40, 70 55 C70 75, 60 85, 50 85 C40 85, 30 75, 30 55 C30 40, 45 30, 50 10 Z",
                    ],
                  }}
                  transition={{
                    duration: defrostPhase === 'free' || defrostPhase === 'done' ? 0.4 : 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                
                <motion.path
                  d="M50 35 C53 45, 60 50, 60 58 C60 68, 55 73, 50 73 C45 73, 40 68, 40 58 C40 50, 47 45, 50 35 Z"
                  fill={defrostPhase === 'free' || defrostPhase === 'done' ? "#fef08a" : "#dbeafe"}
                  animate={{
                    opacity: [0.5, 0.9, 0.5],
                  }}
                  transition={{
                    duration: defrostPhase === 'free' || defrostPhase === 'done' ? 0.3 : 1.5,
                    repeat: Infinity,
                  }}
                />
                
                <motion.ellipse
                  cx="50"
                  cy="55"
                  rx="28"
                  ry="40"
                  fill="url(#iceShellGradient)"
                  filter="url(#iceGlowDefrost)"
                  initial={{ opacity: 0.9, scale: 1 }}
                  animate={defrostPhase === 'melting' ? {
                    opacity: [0.9, 0.6, 0.3, 0],
                    scale: [1, 0.95, 0.9, 0.8],
                    y: [0, 5, 10, 20],
                  } : defrostPhase === 'free' || defrostPhase === 'done' ? {
                    opacity: 0,
                    scale: 0.5,
                  } : {
                    opacity: 0.9,
                    scale: 1,
                  }}
                  transition={{
                    duration: 2,
                    ease: "easeOut",
                  }}
                />
                
                {defrostPhase === 'melting' && (
                  <>
                    {[...Array(6)].map((_, i) => (
                      <motion.ellipse
                        key={`crack-${i}`}
                        cx={35 + i * 6}
                        cy={30 + (i % 2) * 10}
                        rx="1"
                        ry="8"
                        fill="#a5f3fc"
                        initial={{ opacity: 0, scaleY: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          scaleY: [0, 1, 1.5, 0],
                        }}
                        transition={{
                          duration: 1.5,
                          delay: 0.2 + i * 0.1,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                    
                    {[...Array(8)].map((_, i) => (
                      <motion.circle
                        key={`drop-${i}`}
                        cx={30 + (i % 4) * 12}
                        cy={80}
                        r="3"
                        fill="#67e8f9"
                        initial={{ opacity: 0, y: 0 }}
                        animate={{ 
                          opacity: [0, 1, 1, 0], 
                          y: [0, 10, 25, 40],
                        }}
                        transition={{
                          duration: 1.2,
                          delay: 0.5 + i * 0.15,
                          ease: "easeIn",
                        }}
                      />
                    ))}
                  </>
                )}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      
      {isDefrosting && (defrostPhase === 'free' || defrostPhase === 'done') && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg sm:text-xl font-bold text-orange-400 text-center mt-4"
        >
          Ofensiva Recuperada!
        </motion.p>
      )}
    </div>
  );
}
