/**
 * Sistema de sonido UI premium usando Web Audio API.
 * Genera tonos sintetizados cortos y elegantes — sin archivos externos.
 */

let audioCtx = null;

function getCtx() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function playTone({ freq = 880, freq2 = null, duration = 0.08, volume = 0.06, type = "sine", attack = 0.005 }) {
  try {
    const ctx = getCtx();
    if (ctx.state === "suspended") ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freq2) {
      osc.frequency.linearRampToValueAtTime(freq2, ctx.currentTime + duration * 0.7);
    }

    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration + 0.01);
  } catch (_) {
    // Web Audio no disponible — falla silenciosamente
  }
}

const sounds = {
  click:   () => playTone({ freq: 1046, freq2: 1318, duration: 0.10, volume: 0.05, type: "sine", attack: 0.003 }),
  open:    () => {
    playTone({ freq: 880, freq2: 1108, duration: 0.15, volume: 0.045, attack: 0.010 });
    setTimeout(() => playTone({ freq: 1108, freq2: 1318, duration: 0.12, volume: 0.03 }), 80);
  },
  close:   () => playTone({ freq: 698, freq2: 523, duration: 0.12, volume: 0.04, attack: 0.005 }),
  success: () => {
    playTone({ freq: 784,  duration: 0.10, volume: 0.05 });
    setTimeout(() => playTone({ freq: 988,  duration: 0.10, volume: 0.05 }), 100);
    setTimeout(() => playTone({ freq: 1175, duration: 0.18, volume: 0.06 }), 200);
  },
  gallery: () => playTone({ freq: 1318, freq2: 1175, duration: 0.08, volume: 0.035, attack: 0.003 }),
  hover:   () => playTone({ freq: 1568, duration: 0.05, volume: 0.018, attack: 0.003 }),
  toggle:  () => playTone({ freq: 622, freq2: 880, duration: 0.10, volume: 0.04, attack: 0.005 }),
};

// ── Estado global ──────────────────────────────────────────────────────────────
let _enabled = (() => {
  try { return localStorage.getItem("jch_sound") !== "off"; } catch { return true; }
})();

const _listeners = new Set();

export function isSoundEnabled() { return _enabled; }

export function setSoundEnabled(val) {
  _enabled = Boolean(val);
  try { localStorage.setItem("jch_sound", _enabled ? "on" : "off"); } catch {}
  _listeners.forEach(fn => fn(_enabled));
}

export function subscribeSoundEnabled(fn) {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}

export function playSound(name) {
  if (!_enabled) return;
  if (sounds[name]) sounds[name]();
}