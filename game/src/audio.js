// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// Engine hum, sirens, gunshots, crashes, pickups and a small music loop.
export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let muted = false;
  let musicTimer = 0;
  let musicStep = 0;
  let sirenOn = false;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenPhase = 0;

  // A minor-key bass line and a sparse lead, 8 steps a bar at 112 BPM.
  const BASS = [55, 0, 55, 65.41, 55, 0, 49, 58.27];
  const LEAD = [220, 0, 261.63, 0, 329.63, 0, 261.63, 196];

  function ensure() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function noiseBuffer(seconds) {
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function blip(freq, duration, type, volume, slideTo) {
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  function noiseHit(duration, volume, filterFreq) {
    if (!ctx || muted) return;
    const source = ctx.createBufferSource();
    source.buffer = noiseBuffer(duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  function startEngine() {
    if (!ctx || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc2 = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc2.type = 'square';
    engineOsc.frequency.value = 60;
    engineOsc2.frequency.value = 90;
    engineFilter = ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 400;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    engineOsc.connect(engineFilter);
    engineOsc2.connect(engineFilter);
    engineFilter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
    engineOsc2.start();
  }

  function stopEngine() {
    if (!engineOsc) return;
    try {
      engineOsc.stop();
      engineOsc2.stop();
    } catch {
      // Already stopped.
    }
    engineOsc = null;
    engineOsc2 = null;
    engineGain = null;
    engineFilter = null;
  }

  function setSiren(on) {
    if (on === sirenOn) return;
    sirenOn = on;
    if (!ctx) return;
    if (on) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'triangle';
      sirenOsc.frequency.value = 720;
      sirenGain = ctx.createGain();
      sirenGain.gain.value = 0.05;
      sirenOsc.connect(sirenGain);
      sirenGain.connect(master);
      sirenOsc.start();
    } else if (sirenOsc) {
      try {
        sirenOsc.stop();
      } catch {
        // Already stopped.
      }
      sirenOsc = null;
      sirenGain = null;
    }
  }

  return {
    ensure,
    get muted() {
      return muted;
    },    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    gunshot() {
      noiseHit(0.14, 0.5, 1800);
      blip(160, 0.08, 'square', 0.25, 60);
    },
    punch() {
      noiseHit(0.08, 0.3, 900);
    },
    crash() {
      noiseHit(0.25, 0.55, 500);
      blip(90, 0.2, 'sine', 0.4, 45);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.3);
      setTimeout(() => blip(990, 0.12, 'sine', 0.3), 70);
    },
    missionDone() {
      [523, 659, 784, 1047].forEach((freq, i) => {
        setTimeout(() => blip(freq, 0.16, 'triangle', 0.32), i * 110);
      });
    },
    fail() {
      blip(220, 0.4, 'sawtooth', 0.25, 110);
    },
    reload() {
      blip(300, 0.05, 'square', 0.2);
      setTimeout(() => blip(420, 0.05, 'square', 0.2), 120);
    },
    setEngine(speedRatio, driving) {
      if (!ctx) return;
      if (driving) startEngine();
      else {
        stopEngine();
        return;
      }
      if (!engineOsc) return;
      const freq = 55 + speedRatio * 165;
      engineOsc.frequency.setTargetAtTime(freq, ctx.currentTime, 0.05);
      engineOsc2.frequency.setTargetAtTime(freq * 1.5, ctx.currentTime, 0.05);
      engineFilter.frequency.setTargetAtTime(350 + speedRatio * 900, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(muted ? 0 : 0.05 + speedRatio * 0.06, ctx.currentTime, 0.1);
    },
    setSiren,
    // Called every frame: advances the siren tone and the music sequencer.
    update(dt, wanted) {
      if (!ctx || muted) return;
      if (sirenOsc) {
        sirenPhase += dt * 2.4;
        sirenOsc.frequency.value = sirenPhase % 2 < 1 ? 720 : 960;
      }
      musicTimer -= dt;
      if (musicTimer <= 0) {
        musicTimer = 60 / 112 / 2;
        const step = musicStep % 8;
        const bass = BASS[step];
        const lead = LEAD[step];
        if (bass) blip(bass, 0.22, 'triangle', 0.16);
        if (lead && wanted < 3) blip(lead, 0.18, 'sine', 0.07);
        musicStep += 1;
      }
    },
  };
}

// A silent stand-in with the same methods, for screenshot scenes and any
// run before the first user gesture created a real audio context.
export function createSilentAudio() {
  return {
    ensure() { return false; },
    muted: true,
    toggleMute() { return true; },
    gunshot() {},
    punch() {},
    crash() {},
    pickup() {},
    missionDone() {},
    fail() {},
    reload() {},
    setEngine() {},
    setSiren() {},
    update() {},
  };
}
