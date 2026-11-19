let context: AudioContext | undefined;
export const canSpeak = () =>
  typeof window !== "undefined" &&
  "speechSynthesis" in window &&
  "SpeechSynthesisUtterance" in window;
export function stopSpeech() {
  if (canSpeak()) window.speechSynthesis.cancel();
}
export function say(word: string, onError?: () => void) {
  if (!canSpeak()) {
    onError?.();
    return;
  }
  try {
    stopSpeech();
    const speech = new SpeechSynthesisUtterance(word);
    speech.lang = "en-US";
    speech.rate = 0.75;
    speech.onerror = () => onError?.();
    window.speechSynthesis.speak(speech);
  } catch {
    onError?.();
  }
}
export function chime(kind: "hit" | "complete") {
  try {
    context ??= new AudioContext();
    void context.resume();
    const start = context.currentTime;
    (kind === "hit" ? [420] : [523, 659, 784]).forEach((freq, i) => {
      const osc = context!.createOscillator(),
        gain = context!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, start + i * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.045, start + i * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + i * 0.09 + 0.15);
      osc.connect(gain);
      gain.connect(context!.destination);
      osc.start(start + i * 0.09);
      osc.stop(start + i * 0.09 + 0.17);
    });
  } catch {
    /* Visual feedback remains available. */
  }
}
