import type { Weather } from '../core/types';

/**
 * Every sound in Navapur is synthesised in the browser: no audio files, no
 * download, no licence. Layered noise for the city and the rain, a filtered
 * sawtooth for whatever you are driving, and after midnight a set of much
 * less friendly voices.
 */
export class Soundscape {
  enabled = true;

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private rain: GainNode | null = null;
  private ambient: GainNode | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private drone: GainNode | null = null;
  private droneVoices: OscillatorNode[] = [];
  private noise: AudioBuffer | null = null;
  private nextBird = 0;
  private nextHaunt = 0;
  private nextCrow = 0;
  private step = 0;
  private hauntLevel = 0;

  async start() {
    if (this.context) { await this.context.resume(); return; }
    const context = new AudioContext();
    this.context = context;
    this.master = context.createGain();
    this.master.gain.value = 0.32;
    this.master.connect(context.destination);

    // Pink-ish noise: the bed under the city, the rain and the whispers.
    const noise = context.createBuffer(1, context.sampleRate * 3, context.sampleRate);
    const channel = noise.getChannelData(0);
    let last = 0;
    for (let i = 0; i < noise.length; i++) { last = (last + Math.random() * 0.12 - 0.06) * 0.98; channel[i] = last; }
    this.noise = noise;

    const layer = (frequency: number, gain: number) => {
      const source = context.createBufferSource();
      source.buffer = noise; source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass'; filter.frequency.value = frequency;
      const output = context.createGain(); output.gain.value = gain;
      source.connect(filter).connect(output).connect(this.master!);
      source.start();
      return output;
    };
    this.rain = layer(3200, 0);
    this.ambient = layer(520, 0.22);

    this.engine = context.createOscillator();
    this.engine.type = 'sawtooth';
    this.engine.frequency.value = 55;
    const engineFilter = context.createBiquadFilter();
    engineFilter.frequency.value = 230;
    this.engineGain = context.createGain();
    this.engineGain.gain.value = 0.006;
    this.engine.connect(engineFilter).connect(this.engineGain).connect(this.master);
    this.engine.start();

    // Two detuned voices a fifth apart: the sound of a street that has stopped
    // being ordinary.
    this.drone = context.createGain();
    this.drone.gain.value = 0;
    const droneFilter = context.createBiquadFilter();
    droneFilter.type = 'lowpass'; droneFilter.frequency.value = 320;
    this.drone.connect(droneFilter).connect(this.master);
    for (const frequency of [41.2, 61.7, 41.9]) {
      const voice = context.createOscillator();
      voice.type = 'sine';
      voice.frequency.value = frequency;
      const level = context.createGain();
      level.gain.value = frequency > 50 ? 0.28 : 0.5;
      voice.connect(level).connect(this.drone);
      voice.start();
      this.droneVoices.push(voice);
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.context) this.master.gain.setTargetAtTime(on ? 0.32 : 0, this.context.currentTime, 0.2);
  }

  private tone(frequency: number, duration: number, gain: number, type: OscillatorType = 'sine', pan = 0) {
    if (!this.context || !this.master || !this.enabled) return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    panner.pan.value = pan;
    envelope.gain.setValueAtTime(0, context.currentTime);
    envelope.gain.linearRampToValueAtTime(gain, context.currentTime + 0.015);
    envelope.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);
    oscillator.connect(envelope).connect(panner).connect(this.master);
    oscillator.start();
    oscillator.stop(context.currentTime + duration + 0.02);
  }

  horn(pan = 0) {
    this.tone(392, 0.33, 0.17, 'sawtooth', pan);
    this.tone(494, 0.32, 0.1, 'sine', pan);
  }

  /* ---------------------------------------------------------------- night */

  /** A voice somewhere out in the dark, sliding down a note that is not quite a note. */
  wail(pan = 0) {
    if (!this.context || !this.master || !this.enabled) return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const filter = context.createBiquadFilter();
    const panner = context.createStereoPanner();
    const vibrato = context.createOscillator();
    const vibratoDepth = context.createGain();
    oscillator.type = 'sine';
    const now = context.currentTime;
    const start = 300 + Math.random() * 180;
    oscillator.frequency.setValueAtTime(start, now);
    oscillator.frequency.exponentialRampToValueAtTime(start * 0.42, now + 2.6);
    vibrato.frequency.value = 4.6 + Math.random() * 2;
    vibratoDepth.gain.value = 9;
    vibrato.connect(vibratoDepth).connect(oscillator.frequency);
    filter.type = 'bandpass'; filter.frequency.value = 620; filter.Q.value = 2.4;
    panner.pan.value = pan;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.075 * this.hauntLevel, now + 0.9);
    envelope.gain.exponentialRampToValueAtTime(0.0008, now + 3);
    oscillator.connect(filter).connect(envelope).connect(panner).connect(this.master);
    oscillator.start(now); vibrato.start(now);
    oscillator.stop(now + 3.1); vibrato.stop(now + 3.1);
  }

  /** Not words. Close enough to words that you will listen for them. */
  whisper(pan = 0) {
    if (!this.context || !this.master || !this.noise || !this.enabled) return;
    const context = this.context;
    const source = context.createBufferSource();
    source.buffer = this.noise;
    source.loop = true;
    source.playbackRate.value = 0.7 + Math.random() * 0.5;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1400 + Math.random() * 900;
    filter.Q.value = 7;
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    panner.pan.value = pan;
    const now = context.currentTime;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.11 * this.hauntLevel, now + 0.25);
    envelope.gain.setValueAtTime(0.11 * this.hauntLevel, now + 0.9);
    envelope.gain.exponentialRampToValueAtTime(0.0006, now + 1.9);
    source.connect(filter).connect(envelope).connect(panner).connect(this.master);
    source.start(now);
    source.stop(now + 2);
  }

  /** The sound of turning round. */
  stinger() {
    if (!this.enabled) return;
    this.tone(1180, 0.5, 0.12, 'sawtooth', (Math.random() - 0.5) * 1.4);
    this.tone(58, 1.6, 0.2, 'sine');
    setTimeout(() => this.tone(880, 0.35, 0.06, 'triangle'), 90);
  }

  /** A street dog, several lanes away, telling the whole colony about it. */
  howl(pan = 0) {
    if (!this.context || !this.enabled) return;
    const context = this.context;
    const oscillator = context.createOscillator();
    const envelope = context.createGain();
    const panner = context.createStereoPanner();
    const now = context.currentTime;
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(240, now);
    oscillator.frequency.linearRampToValueAtTime(420, now + 0.4);
    oscillator.frequency.linearRampToValueAtTime(300, now + 1.5);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 900;
    panner.pan.value = pan;
    envelope.gain.setValueAtTime(0, now);
    envelope.gain.linearRampToValueAtTime(0.055, now + 0.25);
    envelope.gain.exponentialRampToValueAtTime(0.0008, now + 1.8);
    oscillator.connect(filter).connect(envelope).connect(panner).connect(this.master!);
    oscillator.start(now); oscillator.stop(now + 1.9);
  }

  private crow(pan = 0) {
    this.tone(760, 0.16, 0.05, 'sawtooth', pan);
    setTimeout(() => this.tone(690, 0.14, 0.04, 'sawtooth', pan), 200);
  }

  /** 0 to 1. Raises the drone and starts the night's own schedule of sounds. */
  setHaunting(level: number) {
    this.hauntLevel = level;
    if (this.drone && this.context) {
      this.drone.gain.setTargetAtTime(level * 0.09, this.context.currentTime, 1.4);
      for (const voice of this.droneVoices) {
        voice.detune.setTargetAtTime(Math.sin(this.context.currentTime * 0.2) * 22 * level, this.context.currentTime, 2);
      }
    }
  }

  update(dt: number, elapsed: number, weather: Weather, time: number, moving: boolean, speed: number, district: string) {
    if (!this.context) return;
    const context = this.context;
    this.rain!.gain.setTargetAtTime(weather === 'rain' ? 0.85 : 0, context.currentTime, 0.8);
    this.engine!.frequency.setTargetAtTime(42 + Math.abs(speed) * 5, context.currentTime, 0.2);
    this.engineGain!.gain.setTargetAtTime(speed === 0 ? 0.007 : 0.025, context.currentTime, 0.3);
    const quiet = district.toLowerCase().includes('park') ? 0.1 : 0.3;
    this.ambient!.gain.setTargetAtTime(quiet * (1 - this.hauntLevel * 0.65), context.currentTime, 1);

    if (elapsed > this.nextBird && time > 360 && time < 1140 && weather !== 'rain' && this.hauntLevel < 0.2) {
      this.nextBird = elapsed + 5 + Math.random() * 7;
      this.tone(2300 + Math.random() * 800, 0.14, 0.08, 'sine', Math.random() * 2 - 1);
      setTimeout(() => this.tone(2900, 0.11, 0.05, 'sine'), 180);
    }

    // The night keeps its own schedule.
    if (this.hauntLevel > 0.12 && elapsed > this.nextHaunt) {
      this.nextHaunt = elapsed + (5 + Math.random() * 13) / Math.max(0.2, this.hauntLevel);
      const pan = Math.random() * 2 - 1;
      const roll = Math.random();
      if (roll < 0.34) this.wail(pan);
      else if (roll < 0.68) this.whisper(pan);
      else this.howl(pan);
    }
    if (this.hauntLevel > 0.3 && elapsed > this.nextCrow) {
      this.nextCrow = elapsed + 9 + Math.random() * 20;
      this.crow(Math.random() * 2 - 1);
    }

    this.step += dt;
    if (moving && this.step > 0.36) {
      this.step = 0;
      this.tone(80, 0.07, 0.14, 'triangle');
    }
  }
}
