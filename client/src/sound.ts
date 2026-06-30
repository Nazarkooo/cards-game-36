let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

// Synthesized riffle-shuffle sound (filtered noise bursts) — no external audio asset needed.
export function playShuffleSound() {
  const ctx = getCtx();
  if (!ctx) return;
  if (ctx.state === "suspended") ctx.resume().catch(() => {});

  const duration = 1.1;
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  const burstsPerSecond = 13;
  for (let i = 0; i < bufferSize; i += 1) {
    const t = i / ctx.sampleRate;
    const burstPhase = (t * burstsPerSecond) % 1;
    const envelope = burstPhase < 0.45 ? Math.sin(burstPhase * (Math.PI / 0.45)) ** 2 : 0;
    const fadeOut = 1 - t / duration;
    data[i] = (Math.random() * 2 - 1) * envelope * fadeOut * 0.55;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = 3200;
  filter.Q.value = 0.6;
  const gain = ctx.createGain();
  gain.gain.value = 0.6;

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}
