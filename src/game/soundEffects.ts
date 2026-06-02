const muteStorageKey = 'emoji-survivors-muted';

interface ToneOptions {
  frequency: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  endFrequency?: number;
}

export class SoundEffects {
  private audioContext?: AudioContext;
  private muted = localStorage.getItem(muteStorageKey) === 'true';

  public isMuted() {
    return this.muted;
  }

  public toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem(muteStorageKey, String(this.muted));

    return this.muted;
  }

  public unlock() {
    this.getAudioContext()?.resume();
  }

  public shoot() {
    this.playTone({ frequency: 740, endFrequency: 520, duration: 0.08, volume: 0.05, type: 'square' });
  }

  public enemyHit() {
    this.playTone({ frequency: 220, endFrequency: 150, duration: 0.12, volume: 0.06, type: 'sawtooth' });
  }

  public playerDamage() {
    this.playTone({ frequency: 120, endFrequency: 70, duration: 0.22, volume: 0.8, type: 'triangle' });
  }

  public levelUp() {
    this.playTone({ frequency: 440, endFrequency: 880, duration: 0.18, volume: 0.07, type: 'sine' });
  }

  public gameOver() {
    this.playTone({ frequency: 180, endFrequency: 55, duration: 0.5, volume: 0.12, type: 'sawtooth' });
  }

  private getAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    return this.audioContext;
  }

  private playTone(options: ToneOptions) {
    if (this.muted) {
      return;
    }

    const audioContext = this.getAudioContext();
    const now = audioContext.currentTime;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = options.type ?? 'sine';
    oscillator.frequency.setValueAtTime(options.frequency, now);

    if (options.endFrequency) {
      oscillator.frequency.exponentialRampToValueAtTime(options.endFrequency, now + options.duration);
    }

    gain.gain.setValueAtTime(options.volume, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + options.duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + options.duration);
  }
}
