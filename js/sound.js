// sound.js - Sound effects manager for Pazaak

export class SoundManager {
    constructor() {
        this.enabled = this.loadSoundPreference();
        this.audioContext = null;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.initialized = true;
        } catch (e) {
            console.warn('Web Audio API not supported:', e);
        }
    }

    loadSoundPreference() {
        const stored = localStorage.getItem('pazaak-sound');
        return stored !== 'false'; // default to true
    }

    saveSoundPreference() {
        localStorage.setItem('pazaak-sound', this.enabled.toString());
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveSoundPreference();
        return this.enabled;
    }

    isEnabled() {
        return this.enabled;
    }

    // Generate sounds using Web Audio API
    playTone(frequency, duration, type = 'sine', volume = 0.3) {
        if (!this.enabled || !this.audioContext) return;

        // Resume audio context if suspended (required for some browsers)
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        oscillator.start(this.audioContext.currentTime);
        oscillator.stop(this.audioContext.currentTime + duration);
    }

    playNoise(duration, volume = 0.2) {
        if (!this.enabled || !this.audioContext) return;

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume();
        }

        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.audioContext.createBufferSource();
        const gainNode = this.audioContext.createGain();
        const filter = this.audioContext.createBiquadFilter();

        noise.buffer = buffer;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, this.audioContext.currentTime);

        noise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(this.audioContext.destination);

        gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);

        noise.start(this.audioContext.currentTime);
        noise.stop(this.audioContext.currentTime + duration);
    }

    // Sound effects
    cardDraw() {
        this.init();
        // Quick swoosh sound
        this.playNoise(0.1, 0.15);
        setTimeout(() => this.playTone(400, 0.08, 'sine', 0.2), 50);
    }

    cardPlay() {
        this.init();
        // Thud/placement sound
        this.playTone(150, 0.1, 'sine', 0.3);
        this.playNoise(0.08, 0.2);
    }

    buttonClick() {
        this.init();
        // UI click
        this.playTone(600, 0.05, 'square', 0.1);
    }

    roundWin() {
        this.init();
        // Victory fanfare
        setTimeout(() => this.playTone(523, 0.15, 'sine', 0.3), 0);    // C5
        setTimeout(() => this.playTone(659, 0.15, 'sine', 0.3), 150);  // E5
        setTimeout(() => this.playTone(784, 0.3, 'sine', 0.3), 300);   // G5
    }

    roundLose() {
        this.init();
        // Defeat sound
        setTimeout(() => this.playTone(392, 0.2, 'sine', 0.3), 0);    // G4
        setTimeout(() => this.playTone(330, 0.2, 'sine', 0.3), 200);  // E4
        setTimeout(() => this.playTone(262, 0.4, 'sine', 0.3), 400);  // C4
    }

    matchWin() {
        this.init();
        // Big victory sound
        setTimeout(() => this.playTone(523, 0.12, 'sine', 0.35), 0);
        setTimeout(() => this.playTone(659, 0.12, 'sine', 0.35), 120);
        setTimeout(() => this.playTone(784, 0.12, 'sine', 0.35), 240);
        setTimeout(() => this.playTone(1047, 0.4, 'sine', 0.4), 360);
    }

    matchLose() {
        this.init();
        // Big defeat sound
        setTimeout(() => this.playTone(330, 0.15, 'triangle', 0.3), 0);
        setTimeout(() => this.playTone(262, 0.15, 'triangle', 0.3), 150);
        setTimeout(() => this.playTone(196, 0.15, 'triangle', 0.3), 300);
        setTimeout(() => this.playTone(165, 0.5, 'triangle', 0.35), 450);
    }

    bust() {
        this.init();
        // Bust/failure sound
        this.playTone(200, 0.3, 'sawtooth', 0.2);
        this.playNoise(0.2, 0.15);
    }

    stand() {
        this.init();
        // Confirmation beep
        this.playTone(800, 0.1, 'sine', 0.2);
        setTimeout(() => this.playTone(1000, 0.15, 'sine', 0.2), 100);
    }
}

// Export singleton instance
export const soundManager = new SoundManager();
