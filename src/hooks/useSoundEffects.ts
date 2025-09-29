'use client';

import { useCallback } from 'react';

export function useSoundEffects() {
  const playSound = useCallback((soundType: 'move' | 'check' | 'checkmate' | 'castle' | 'capture') => {
    try {
      // Create audio context for sound generation
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      let frequency: number;
      let duration: number;
      let type: OscillatorType = 'sine';
      
      switch (soundType) {
        case 'move':
          frequency = 440; // A4
          duration = 0.1;
          break;
        case 'check':
          frequency = 660; // E5
          duration = 0.2;
          type = 'square';
          break;
        case 'checkmate':
          frequency = 880; // A5
          duration = 0.5;
          type = 'sawtooth';
          break;
        case 'castle':
          frequency = 330; // E4
          duration = 0.3;
          type = 'triangle';
          break;
        case 'capture':
          frequency = 220; // A3
          duration = 0.15;
          type = 'square';
          break;
        default:
          frequency = 440;
          duration = 0.1;
      }
      
      // Create oscillator
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = type;
      
      // Set volume envelope
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
      
    } catch (error) {
      console.log('Sound not available:', error);
    }
  }, []);

  return { playSound };
}
