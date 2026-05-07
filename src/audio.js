let _audioCtx = null;

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed')
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

export function warmUpAudio() {
  try { getAudioCtx(); } catch (_) {}
}

// Short double-beep at 3 min and 1 min remaining
export function playWarningBeep() {
  try {
    const ctx = getAudioCtx();
    const fire = () => {
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sine'; osc.frequency.value = 880;
        const t = ctx.currentTime + i * 0.28;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.6, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.start(t); osc.stop(t + 0.22);
      }
    };
    ctx.state === 'suspended' ? ctx.resume().then(fire) : fire();
  } catch (_) {}
}

// Three descending blasts — loud end-of-round siren
export function playAlarm() {
  try {
    const ctx = getAudioCtx();
    const fire = () => {
      const blasts = [
        { freq: 1200, dur: 0.55, gap: 0.15 },
        { freq: 900,  dur: 0.55, gap: 0.15 },
        { freq: 600,  dur: 0.9,  gap: 0    },
      ];
      let t = ctx.currentTime + 0.05;
      blasts.forEach(({ freq, dur, gap }) => {
        const osc = ctx.createOscillator(), osc2 = ctx.createOscillator(), gain = ctx.createGain();
        osc.connect(gain); osc2.connect(gain); gain.connect(ctx.destination);
        osc.type = 'sawtooth'; osc.frequency.value = freq;
        osc2.type = 'square';  osc2.frequency.value = freq * 1.5;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1.0, t + 0.02);
        gain.gain.setValueAtTime(1.0, t + dur - 0.08);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.start(t); osc.stop(t + dur);
        osc2.start(t); osc2.stop(t + dur);
        t += dur + gap;
      });
    };
    ctx.state === 'suspended' ? ctx.resume().then(fire) : fire();
  } catch (_) {}
}
