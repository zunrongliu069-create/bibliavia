import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = resolve(root, 'assets', 'audio');
mkdirSync(output, { recursive: true });

const sampleRate = 44_100;
const writeWave = (name, duration, notes, volume = 0.2, loopTexture = false) => {
  const samples = Math.floor(duration * sampleRate);
  const bytes = Buffer.alloc(44 + samples * 2);
  bytes.write('RIFF', 0);
  bytes.writeUInt32LE(36 + samples * 2, 4);
  bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24);
  bytes.writeUInt32LE(sampleRate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write('data', 36);
  bytes.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    const time = index / sampleRate;
    const attack = Math.min(1, time / 0.025);
    const release = loopTexture ? 1 : Math.min(1, (duration - time) / Math.min(0.35, duration / 2));
    const envelope = attack * release;
    const signal = notes.reduce((sum, frequency, noteIndex) => {
      const offset = loopTexture ? 0 : noteIndex * Math.min(0.075, duration / notes.length / 2);
      if (time < offset) return sum;
      const local = time - offset;
      return (
        sum +
        Math.sin(Math.PI * 2 * frequency * local) * 0.72 +
        Math.sin(Math.PI * 2 * frequency * 2 * local) * 0.18
      );
    }, 0);
    const normalized = signal / Math.max(1, notes.length);
    bytes.writeInt16LE(
      Math.round(Math.max(-1, Math.min(1, normalized * envelope * volume)) * 32767),
      44 + index * 2,
    );
  }
  writeFileSync(resolve(output, name), bytes);
};

writeWave('correct.wav', 0.34, [349, 440, 523], 0.22);
writeWave('wrong.wav', 0.28, [294, 247], 0.18);
writeWave('partial.wav', 0.42, [330, 392], 0.18);
writeWave('progress.wav', 0.4, [349, 440], 0.16);
writeWave('beat-complete.wav', 1.35, [330, 392, 494], 0.2);
writeWave('path-complete.wav', 3.2, [349, 440, 523, 698], 0.22);
writeWave('fragment.wav', 2.8, [392, 494, 587, 784], 0.2);
writeWave('ambient.wav', 8, [196, 294], 0.07, true);
