/**
 * Audio Synthesizer & Visualizer System
 * Generates authentic Alexa chimes and synchronizes audio equalizer bars using Web Audio API.
 * 100% offline, ₹0 budget, zero external sound dependencies.
 */

class AudioSynthesizer {
  constructor() {
    this.audioCtx = null;
    this.isEqualizerActive = false;
    this.equalizerInterval = null;
    this.equalizerBars = document.querySelectorAll('#audioEqualizer .bar');
  }

  initContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  /**
   * Plays the signature Alexa wake-up chime (Two-tone ascending chime)
   */
  playWakeChime() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      gain1.gain.setValueAtTime(0.45, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);
      osc1.start(now);
      osc1.stop(now + 0.22);

      // Tone 2: 880 Hz (A5)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(880, now + 0.14); // A5
      gain2.gain.setValueAtTime(0.5, now + 0.14);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);
      osc2.start(now + 0.14);
      osc2.stop(now + 0.38);
    } catch (e) {
      console.warn('Audio chime playback failed:', e);
    }
  }

  /**
   * Plays confirmation/completion chime
   */
  playSuccessChime() {
    try {
      this.initContext();
      if (!this.audioCtx) return;

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.25);
    } catch (e) {
      console.warn('Audio success chime failed:', e);
    }
  }

  /**
   * Start dynamic equalizer bars animation during speech
   */
  startEqualizer() {
    if (this.isEqualizerActive) return;
    this.isEqualizerActive = true;
    if (this.equalizerBars.length === 0) {
      this.equalizerBars = document.querySelectorAll('#audioEqualizer .bar');
    }

    this.equalizerInterval = setInterval(() => {
      this.equalizerBars.forEach((bar) => {
        const randomHeight = Math.floor(Math.random() * 20) + 4;
        bar.style.height = `${randomHeight}px`;
      });
    }, 70);
  }

  /**
   * Stop dynamic equalizer bars
   */
  stopEqualizer() {
    this.isEqualizerActive = false;
    if (this.equalizerInterval) {
      clearInterval(this.equalizerInterval);
      this.equalizerInterval = null;
    }
    this.equalizerBars.forEach((bar) => {
      bar.style.height = '4px';
    });
  }
}

// Global instance
window.audioSynth = new AudioSynthesizer();
