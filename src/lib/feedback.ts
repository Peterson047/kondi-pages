// Audio and Haptic feedback on successful scan
export function playScanSuccessFeedback(): void {
  // 1. Audio "beep" via Web Audio API (standard scanner sound)
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.1);

      // Clean up after playing
      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, 200);
    }
  } catch {
    // Audio autoplay blocked or not supported
  }

  // 2. Haptic vibration (short double pulse)
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate([35, 30, 35]);
    }
  } catch {
    // Vibration not supported
  }
}
