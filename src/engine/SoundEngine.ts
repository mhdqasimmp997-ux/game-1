import { AudioSettings, WeatherType } from '../types/game';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private notifGain: GainNode | null = null;
  private dialogueGain: GainNode | null = null;

  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;

  private ambientNoiseNode: AudioBufferSourceNode | null = null;
  private ambientFilter: BiquadFilterNode | null = null;
  private musicTimer: number | null = null;
  private alarmTimer: number | null = null;
  private alarmRunning = false;

  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenActive = false;

  private settings: AudioSettings;
  private unlocked = false;

  constructor(initialSettings: AudioSettings) {
    this.settings = { ...initialSettings };
  }

  public unlock() {
    if (this.unlocked && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      return;
    }
    try {
      const AudioCtx =
        window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.engineGain = this.ctx.createGain();
      this.ambientGain = this.ctx.createGain();
      this.musicGain = this.ctx.createGain();
      this.notifGain = this.ctx.createGain();
      this.dialogueGain = this.ctx.createGain();

      this.sfxGain.connect(this.masterGain);
      this.engineGain.connect(this.masterGain);
      this.ambientGain.connect(this.masterGain);
      this.musicGain.connect(this.masterGain);
      this.notifGain.connect(this.masterGain);
      this.dialogueGain.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);

      this.applySettings(this.settings);
      this.setupEngineSynth();
      this.setupAmbientSynth();
      this.setupMusicLoop();
      this.unlocked = true;
    } catch {
      // Web Audio unavailable
    }
  }

  public applySettings(s: AudioSettings) {
    this.settings = { ...s };
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.engineGain || !this.ambientGain || !this.musicGain || !this.notifGain || !this.dialogueGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(s.master, now, 0.05);
    this.sfxGain.gain.setTargetAtTime(s.sfx, now, 0.05);
    this.engineGain.gain.setTargetAtTime(s.engine * 0.22, now, 0.05);
    this.ambientGain.gain.setTargetAtTime(s.ambient * 0.16, now, 0.05);
    this.musicGain.gain.setTargetAtTime(s.music * 0.12, now, 0.05);
    this.notifGain.gain.setTargetAtTime(s.notifications, now, 0.05);
    this.dialogueGain.gain.setTargetAtTime(s.dialogue, now, 0.05);
  }

  private setupEngineSynth() {
    if (!this.ctx || !this.engineGain) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineFilter = this.ctx.createBiquadFilter();
    const localGain = this.ctx.createGain();
    localGain.gain.value = 0;

    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 50;
    this.engineSubOsc.type = 'triangle';
    this.engineSubOsc.frequency.value = 25;

    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 160;
    this.engineFilter.Q.value = 2.0;

    this.engineOsc.connect(this.engineFilter);
    this.engineSubOsc.connect(this.engineFilter);
    this.engineFilter.connect(localGain);
    localGain.connect(this.engineGain);

    this.engineOsc.start();
    this.engineSubOsc.start();
    (this.engineFilter as unknown as { _outGain: GainNode })._outGain = localGain;
  }

  public updateEngine(active: boolean, speedRatio: number) {
    if (!this.ctx || !this.engineOsc || !this.engineSubOsc || !this.engineFilter) return;
    const localGain = (this.engineFilter as unknown as { _outGain?: GainNode })._outGain;
    if (!localGain) return;
    const now = this.ctx.currentTime;
    if (!active) {
      localGain.gain.setTargetAtTime(0, now, 0.08);
      return;
    }
    const clamped = Math.min(1.1, Math.max(0, Math.abs(speedRatio)));
    const freq = 44 + clamped * 95;
    this.engineOsc.frequency.setTargetAtTime(freq, now, 0.08);
    this.engineSubOsc.frequency.setTargetAtTime(freq * 0.5, now, 0.08);
    localGain.gain.setTargetAtTime(0.28 + clamped * 0.35, now, 0.08);
  }

  private setupAmbientSynth() {
    if (!this.ctx || !this.ambientGain) return;
    const sampleRate = this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = data[i];
      data[i] *= 2.0;
    }

    this.ambientNoiseNode = this.ctx.createBufferSource();
    this.ambientNoiseNode.buffer = buffer;
    this.ambientNoiseNode.loop = true;

    this.ambientFilter = this.ctx.createBiquadFilter();
    this.ambientFilter.type = 'bandpass';
    this.ambientFilter.frequency.value = 300;
    this.ambientFilter.Q.value = 0.7;

    this.ambientNoiseNode.connect(this.ambientFilter);
    this.ambientFilter.connect(this.ambientGain);
    this.ambientNoiseNode.start();
  }

  public updateWeatherAmbient(weather: WeatherType) {
    if (!this.ctx || !this.ambientFilter || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    if (weather === 'rain') {
      this.ambientFilter.type = 'highpass';
      this.ambientFilter.frequency.setTargetAtTime(700, now, 0.5);
      this.ambientGain.gain.setTargetAtTime(this.settings.ambient * 0.32, now, 0.5);
    } else if (weather === 'fog' || weather === 'cloudy') {
      this.ambientFilter.type = 'lowpass';
      this.ambientFilter.frequency.setTargetAtTime(310, now, 0.5);
      this.ambientGain.gain.setTargetAtTime(this.settings.ambient * 0.16, now, 0.5);
    } else {
      this.ambientFilter.type = 'bandpass';
      this.ambientFilter.frequency.setTargetAtTime(260, now, 0.5);
      this.ambientGain.gain.setTargetAtTime(this.settings.ambient * 0.11, now, 0.5);
    }
  }

  private setupMusicLoop() {
    const notes = [146.83, 174.61, 220.0, 196.0, 130.81, 164.81, 196.0, 146.83];
    let step = 0;
    this.musicTimer = window.setInterval(() => {
      if (!this.ctx || !this.musicGain || this.ctx.state !== 'running' || this.settings.music <= 0.01) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = notes[step % notes.length];
      g.gain.setValueAtTime(0.001, now);
      g.gain.linearRampToValueAtTime(0.22, now + 0.8);
      g.gain.exponentialRampToValueAtTime(0.001, now + 3.4);
      osc.connect(g);
      g.connect(this.musicGain);
      osc.start(now);
      osc.stop(now + 3.5);
      step++;
    }, 3800);
  }

  // Repeating "KEE KEE KEE!" arrival alarm
  public playArrivalAlarmBurst() {
    if (!this.ctx || !this.notifGain || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    [0, 0.19, 0.38].forEach((offset) => {
      if (!this.ctx || !this.notifGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1920, now + offset);
      osc.frequency.linearRampToValueAtTime(2240, now + offset + 0.08);
      g.gain.setValueAtTime(0.001, now + offset);
      g.gain.linearRampToValueAtTime(0.22, now + offset + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.13);
      osc.connect(g);
      g.connect(this.notifGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.14);
    });
  }

  public startArrivalAlarm() {
    if (this.alarmRunning) return;
    this.alarmRunning = true;
    this.playArrivalAlarmBurst();
    this.alarmTimer = window.setInterval(() => {
      if (this.alarmRunning) {
        this.playArrivalAlarmBurst();
      }
    }, 2200);
  }

  public stopArrivalAlarm() {
    this.alarmRunning = false;
    if (this.alarmTimer) {
      window.clearInterval(this.alarmTimer);
      this.alarmTimer = null;
    }
  }

  public playMultiQueueAlert() {
    if (!this.ctx || !this.notifGain) return;
    const now = this.ctx.currentTime;
    [780, 1040].forEach((f, idx) => {
      if (!this.ctx || !this.notifGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.2, now + idx * 0.12);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.18);
      osc.connect(g);
      g.connect(this.notifGain);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 0.2);
    });
  }

  public playWeighbridgeBeep(overweight: boolean) {
    if (!this.ctx || !this.notifGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = overweight ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(overweight ? 420 : 880, now);
    if (!overweight) osc.frequency.setValueAtTime(1180, now + 0.1);
    g.gain.setValueAtTime(0.22, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.connect(g);
    g.connect(this.notifGain);
    osc.start(now);
    osc.stop(now + 0.36);
  }

  public playTelephoneRing() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    [0, 0.14, 0.28].forEach((off) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 1320;
      g.gain.setValueAtTime(0.15, now + off);
      g.gain.exponentialRampToValueAtTime(0.001, now + off + 0.1);
      osc.connect(g);
      g.connect(this.sfxGain);
      osc.start(now + off);
      osc.stop(now + off + 0.11);
    });
  }

  public playDialogueCue(positive: boolean) {
    if (!this.ctx || !this.dialogueGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(positive ? 320 : 210, now);
    osc.frequency.linearRampToValueAtTime(positive ? 390 : 160, now + 0.16);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.dialogueGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playFootstep(onAsphalt: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(onAsphalt ? 130 : 95, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.08);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);
  }

  public playClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(380, now + 0.04);
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playStamp(approved: boolean) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = approved ? 'triangle' : 'square';
    osc.frequency.setValueAtTime(approved ? 520 : 165, now);
    osc.frequency.exponentialRampToValueAtTime(approved ? 780 : 65, now + 0.16);
    g.gain.setValueAtTime(0.24, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.2);
  }

  public playRejectionWarning() {
    if (!this.ctx || !this.notifGain) return;
    const now = this.ctx.currentTime;
    [0, 0.22, 0.44].forEach((offset, idx) => {
      if (!this.ctx || !this.notifGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(idx % 2 === 0 ? 480 : 340, now + offset);
      osc.frequency.linearRampToValueAtTime(idx % 2 === 0 ? 390 : 280, now + offset + 0.17);
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;
      g.gain.setValueAtTime(0.26, now + offset);
      g.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.19);
      osc.connect(filter);
      filter.connect(g);
      g.connect(this.notifGain);
      osc.start(now + offset);
      osc.stop(now + offset + 0.2);
    });
  }

  public playTowHitch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    // Hydraulic servo whine followed by heavy steel coupling clank
    const hydro = this.ctx.createOscillator();
    const hg = this.ctx.createGain();
    hydro.type = 'sawtooth';
    hydro.frequency.setValueAtTime(115, now);
    hydro.frequency.linearRampToValueAtTime(215, now + 0.48);
    const hf = this.ctx.createBiquadFilter();
    hf.type = 'lowpass';
    hf.frequency.value = 460;
    hg.gain.setValueAtTime(0.15, now);
    hg.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    hydro.connect(hf);
    hf.connect(hg);
    hg.connect(this.sfxGain);
    hydro.start(now);
    hydro.stop(now + 0.56);

    const clank = this.ctx.createOscillator();
    const cg = this.ctx.createGain();
    clank.type = 'square';
    clank.frequency.setValueAtTime(290, now + 0.45);
    clank.frequency.exponentialRampToValueAtTime(72, now + 0.65);
    cg.gain.setValueAtTime(0.28, now + 0.45);
    cg.gain.exponentialRampToValueAtTime(0.001, now + 0.68);
    clank.connect(cg);
    cg.connect(this.sfxGain);
    clank.start(now + 0.45);
    clank.stop(now + 0.7);
  }

  public playPaper() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const buf = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * 0.12), this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2400;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.16, now);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(now);
  }

  public playGate() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(105, now);
    osc.frequency.linearRampToValueAtTime(160, now + 0.45);
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    g.gain.setValueAtTime(0.14, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playHorn(isTruck = false) {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const freqs = isTruck ? [155, 195] : [340, 425];
    freqs.forEach((freq) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = freq;
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = isTruck ? 550 : 950;
      g.gain.setValueAtTime(0.16, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      osc.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.45);
    });
  }

  public playRadioBeep() {
    if (!this.ctx || !this.notifGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1240, now);
    osc.frequency.setValueAtTime(920, now + 0.06);
    g.gain.setValueAtTime(0.16, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.notifGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public setSiren(enabled: boolean) {
    this.sirenActive = enabled;
    if (!this.ctx || !this.sfxGain) return;
    if (enabled && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'triangle';
      this.sirenOsc.frequency.value = 640;
      this.sirenGain.gain.value = 0.09;
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain);
      this.sirenOsc.start();
    } else if (!enabled && this.sirenOsc) {
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenGain?.disconnect();
      } catch {
        // ignore
      }
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  public updateSiren(elapsed: number) {
    if (this.sirenActive && this.sirenOsc && this.ctx) {
      const f = 680 + Math.sin(elapsed * 5.5) * 230;
      this.sirenOsc.frequency.setTargetAtTime(f, this.ctx.currentTime, 0.03);
    }
  }

  public playFlashlightClick() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(520, now + 0.03);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.05);
  }

  public playCargoLatch() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(85, now + 0.22);
    g.gain.setValueAtTime(0.18, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  public playCoffeeSip() {
    if (!this.ctx || !this.sfxGain) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(320, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.14);
    g.gain.setValueAtTime(0.12, now);
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(g);
    g.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.18);
  }

  public playPromotion() {
    if (!this.ctx || !this.notifGain) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
      if (!this.ctx || !this.notifGain) return;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0.16, now + i * 0.09);
      g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.26);
      osc.connect(g);
      g.connect(this.notifGain);
      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.28);
    });
  }

  public dispose() {
    this.stopArrivalAlarm();
    this.setSiren(false);
    if (this.musicTimer) window.clearInterval(this.musicTimer);
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.ambientNoiseNode?.stop();
      void this.ctx?.close();
    } catch {
      // ignore
    }
  }
}
