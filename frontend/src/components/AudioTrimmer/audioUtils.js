// src/components/AudioTrimmer/audioUtils.js
// Decoding, waveform peaks, trimming and WAV encoding, all in the browser.

// Peaks are computed once at this resolution and resampled down to whatever
// width the canvas happens to be, so resizing never re-scans the samples.
export const PEAK_BUCKETS = 4096;

/**
 * Format seconds as M:SS.mmm (H:MM:SS.mmm past an hour).
 */
export const formatTime = (seconds) => {
    const safe = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;
    const totalMs = Math.round(safe * 1000);
    const ms = totalMs % 1000;
    const totalSeconds = Math.floor(totalMs / 1000);
    const secs = totalSeconds % 60;
    const totalMinutes = Math.floor(totalSeconds / 60);
    const mins = totalMinutes % 60;
    const hours = Math.floor(totalMinutes / 60);

    const pad = (value, width) => String(value).padStart(width, '0');
    const tail = `${pad(secs, 2)}.${pad(ms, 3)}`;

    return hours > 0 ? `${hours}:${pad(mins, 2)}:${tail}` : `${mins}:${tail}`;
};

/**
 * Parse a time string back to seconds, or null if it is not a time.
 * Accepts SS.mmm, M:SS.mmm and H:MM:SS.mmm.
 */
export const parseTime = (text) => {
    if (typeof text !== 'string') return null;

    const trimmed = text.trim();
    if (!trimmed) return null;

    const parts = trimmed.split(':');
    if (parts.length > 3) return null;

    let seconds = 0;
    for (let i = 0; i < parts.length; i += 1) {
        const part = parts[i].trim();
        if (!/^\d*\.?\d*$/.test(part) || part === '' || part === '.') return null;

        const value = parseFloat(part);
        if (!Number.isFinite(value)) return null;

        // Only the last field may exceed 59 -- "90" alone means 90 seconds.
        if (i < parts.length - 1 && value !== Math.floor(value)) return null;

        seconds = seconds * 60 + value;
    }

    return seconds;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/**
 * Decode an audio file into an AudioBuffer.
 * Throws if the browser has no decoder for this format.
 */
export const decodeAudioFile = async (file) => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) {
        throw new Error('This browser does not support the Web Audio API.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const context = new AudioContextCtor();

    try {
        // Safari only gained the promise form recently, so accept both.
        return await new Promise((resolve, reject) => {
            const decoded = context.decodeAudioData(arrayBuffer, resolve, reject);
            if (decoded && typeof decoded.then === 'function') {
                decoded.then(resolve, reject);
            }
        });
    } finally {
        context.close();
    }
};

/**
 * Reduce an AudioBuffer to one peak amplitude (0..1) per bucket, taking the
 * loudest channel at each point so nothing quiet-looking hides a loud channel.
 */
export const computePeaks = (audioBuffer, buckets = PEAK_BUCKETS) => {
    const channels = [];
    for (let c = 0; c < audioBuffer.numberOfChannels; c += 1) {
        channels.push(audioBuffer.getChannelData(c));
    }

    const total = audioBuffer.length;
    const peaks = new Float32Array(buckets);
    if (total === 0) return peaks;

    const bucketWidth = total / buckets;

    for (let i = 0; i < buckets; i += 1) {
        const from = Math.floor(i * bucketWidth);
        const to = Math.min(total, Math.max(from + 1, Math.floor((i + 1) * bucketWidth)));

        let peak = 0;
        for (let c = 0; c < channels.length; c += 1) {
            const data = channels[c];
            for (let j = from; j < to; j += 1) {
                const value = data[j] < 0 ? -data[j] : data[j];
                if (value > peak) peak = value;
            }
        }

        peaks[i] = peak > 1 ? 1 : peak;
    }

    return peaks;
};

/**
 * Produce the channel data that an export would contain.
 *
 * 'keep' returns the selection. 'remove' returns everything outside it, with
 * the two remaining pieces butted together.
 */
export const buildOutputChannels = (audioBuffer, start, end, mode) => {
    const sampleRate = audioBuffer.sampleRate;
    const total = audioBuffer.length;

    const from = clamp(Math.round(start * sampleRate), 0, total);
    const to = clamp(Math.round(end * sampleRate), from, total);

    const segments =
        mode === 'keep'
            ? [[from, to]]
            : [
                  [0, from],
                  [to, total],
              ].filter(([a, b]) => b > a);

    const length = segments.reduce((sum, [a, b]) => sum + (b - a), 0);
    const channels = [];

    for (let c = 0; c < audioBuffer.numberOfChannels; c += 1) {
        const source = audioBuffer.getChannelData(c);
        const output = new Float32Array(length);
        let offset = 0;
        segments.forEach(([a, b]) => {
            output.set(source.subarray(a, b), offset);
            offset += b - a;
        });
        channels.push(output);
    }

    return { channels, sampleRate, length };
};

const writeAscii = (view, offset, text) => {
    for (let i = 0; i < text.length; i += 1) {
        view.setUint8(offset + i, text.charCodeAt(i));
    }
};

/**
 * Encode channel data as a 16-bit PCM WAV blob.
 */
export const encodeWav = (channels, sampleRate) => {
    const channelCount = channels.length;
    const frameCount = channelCount > 0 ? channels[0].length : 0;
    const bytesPerSample = 2;
    const dataSize = frameCount * channelCount * bytesPerSample;

    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);

    writeAscii(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeAscii(view, 8, 'WAVE');
    writeAscii(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM header size
    view.setUint16(20, 1, true); // format: PCM
    view.setUint16(22, channelCount, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * channelCount * bytesPerSample, true); // byte rate
    view.setUint16(32, channelCount * bytesPerSample, true); // block align
    view.setUint16(34, 8 * bytesPerSample, true); // bits per sample
    writeAscii(view, 36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < frameCount; i += 1) {
        for (let c = 0; c < channelCount; c += 1) {
            const sample = clamp(channels[c][i], -1, 1);
            // Negative and positive have different headroom in two's complement.
            view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
            offset += bytesPerSample;
        }
    }

    return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * How long the exported file will be, in seconds.
 */
export const outputDuration = (start, end, mode, duration) =>
    mode === 'keep' ? Math.max(0, end - start) : Math.max(0, duration - (end - start));
