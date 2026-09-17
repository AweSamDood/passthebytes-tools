import {
    buildOutputChannels,
    computePeaks,
    encodeWav,
    formatTime,
    outputDuration,
    parseTime,
} from './audioUtils';

// Float32Array cannot hold 0.2 exactly, so sample comparisons need a tolerance.
const near = (actual, expected) => expect(Math.abs(actual - expected)).toBeLessThan(1e-6);

/**
 * Stand in for an AudioBuffer: ten seconds at 100 Hz where every sample holds
 * the second it belongs to, divided by ten. That makes it obvious which part
 * of the source any given output sample came from.
 */
const makeBuffer = (channelCount = 1) => {
    const sampleRate = 100;
    const length = sampleRate * 10;
    const channels = [];

    for (let c = 0; c < channelCount; c += 1) {
        const data = new Float32Array(length);
        for (let i = 0; i < length; i += 1) {
            data[i] = Math.floor(i / sampleRate) / 10;
        }
        channels.push(data);
    }

    return {
        sampleRate,
        length,
        duration: 10,
        numberOfChannels: channelCount,
        getChannelData: index => channels[index],
    };
};

describe('formatTime', () => {
    it.each([
        [0, '0:00.000'],
        [5.5, '0:05.500'],
        [65.25, '1:05.250'],
        [3661.5, '1:01:01.500'],
        [1.23456, '0:01.235'],
    ])('formats %p as %p', (seconds, expected) => {
        expect(formatTime(seconds)).toBe(expected);
    });

    it('clamps values that are not usable times', () => {
        expect(formatTime(-4)).toBe('0:00.000');
        expect(formatTime(NaN)).toBe('0:00.000');
        expect(formatTime(undefined)).toBe('0:00.000');
    });
});

describe('parseTime', () => {
    it.each([
        ['1:05.250', 65.25],
        ['0:00.000', 0],
        ['90', 90],
        ['1:01:01.500', 3661.5],
        ['  2:30  ', 150],
    ])('parses %p as %p seconds', (text, expected) => {
        expect(parseTime(text)).toBe(expected);
    });

    it.each(['abc', '', '1:2:3:4', '1:.', '1:05x', ':'])('rejects %p', text => {
        expect(parseTime(text)).toBeNull();
    });

    it.each([0, 0.001, 1.5, 65.25, 3661.5, 599.999])(
        'round trips %p through formatTime',
        seconds => {
            expect(parseTime(formatTime(seconds))).toBe(seconds);
        }
    );
});

describe('outputDuration', () => {
    it('reports the selection when keeping', () => {
        expect(outputDuration(2, 6, 'keep', 10)).toBe(4);
    });

    it('reports what is left when removing', () => {
        expect(outputDuration(2, 6, 'remove', 10)).toBe(6);
    });
});

describe('buildOutputChannels', () => {
    it('keeps only the selection', () => {
        const { channels, length } = buildOutputChannels(makeBuffer(2), 2, 6, 'keep');

        expect(length).toBe(400);
        expect(channels).toHaveLength(2);
        near(channels[0][0], 0.2);
        near(channels[0][399], 0.5);
    });

    it('stitches the two remaining pieces when removing the middle', () => {
        const { channels, length } = buildOutputChannels(makeBuffer(1), 3, 7, 'remove');

        expect(length).toBe(600);
        // Second 2 must butt straight onto second 7 with nothing in between.
        near(channels[0][299], 0.2);
        near(channels[0][300], 0.7);
    });

    it('keeps the tail when the selection starts at zero', () => {
        const { channels, length } = buildOutputChannels(makeBuffer(1), 0, 4, 'remove');

        expect(length).toBe(600);
        near(channels[0][0], 0.4);
    });

    it('keeps the head when the selection runs to the end', () => {
        const { channels, length } = buildOutputChannels(makeBuffer(1), 6, 10, 'remove');

        expect(length).toBe(600);
        near(channels[0][0], 0);
    });

    it('clamps an end past the buffer', () => {
        expect(buildOutputChannels(makeBuffer(1), 5, 99, 'keep').length).toBe(500);
    });
});

describe('encodeWav', () => {
    // jsdom's Blob has no arrayBuffer(), so go through FileReader.
    const blobToArrayBuffer = blob =>
        new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsArrayBuffer(blob);
        });

    const readHeader = async blob => {
        const bytes = new Uint8Array(await blobToArrayBuffer(blob));
        const view = new DataView(bytes.buffer);
        const ascii = (offset, length) =>
            String.fromCharCode(...bytes.slice(offset, offset + length));
        return { view, ascii };
    };

    it('writes a well formed 16-bit PCM header', async () => {
        const { channels } = buildOutputChannels(makeBuffer(2), 2, 6, 'keep');
        const blob = encodeWav(channels, 100);

        expect(blob.type).toBe('audio/wav');
        expect(blob.size).toBe(44 + 400 * 2 * 2);

        const { view, ascii } = await readHeader(blob);
        expect(ascii(0, 4)).toBe('RIFF');
        expect(ascii(8, 4)).toBe('WAVE');
        expect(ascii(12, 4)).toBe('fmt ');
        expect(ascii(36, 4)).toBe('data');

        expect(view.getUint32(4, true)).toBe(36 + 1600);
        expect(view.getUint16(20, true)).toBe(1); // PCM
        expect(view.getUint16(22, true)).toBe(2); // channels
        expect(view.getUint32(24, true)).toBe(100); // sample rate
        expect(view.getUint32(28, true)).toBe(400); // byte rate
        expect(view.getUint16(32, true)).toBe(4); // block align
        expect(view.getUint16(34, true)).toBe(16); // bit depth
        expect(view.getUint32(40, true)).toBe(1600);
    });

    it('interleaves the channels', async () => {
        const left = Float32Array.from([1, 0]);
        const right = Float32Array.from([0, 1]);
        const { view } = await readHeader(encodeWav([left, right], 100));

        expect(view.getInt16(44, true)).toBe(32767); // frame 0, left
        expect(view.getInt16(46, true)).toBe(0); // frame 0, right
        expect(view.getInt16(48, true)).toBe(0); // frame 1, left
        expect(view.getInt16(50, true)).toBe(32767); // frame 1, right
    });

    it('saturates rather than wrapping when samples clip', async () => {
        const { view } = await readHeader(encodeWav([Float32Array.from([2, -2])], 100));

        expect(view.getInt16(44, true)).toBe(32767);
        expect(view.getInt16(46, true)).toBe(-32768);
    });
});

describe('computePeaks', () => {
    it('follows the shape of the audio', () => {
        const peaks = computePeaks(makeBuffer(1), 10);

        expect(peaks).toHaveLength(10);
        near(peaks[0], 0);
        near(peaks[9], 0.9);
    });

    it('never leaves the 0..1 range', () => {
        const peaks = computePeaks(makeBuffer(2), 32);
        peaks.forEach(peak => {
            expect(peak).toBeGreaterThanOrEqual(0);
            expect(peak).toBeLessThanOrEqual(1);
        });
    });

    it('reports silence as zero', () => {
        const silent = {
            sampleRate: 100,
            length: 100,
            duration: 1,
            numberOfChannels: 1,
            getChannelData: () => new Float32Array(100),
        };

        expect(Array.from(computePeaks(silent, 4))).toEqual([0, 0, 0, 0]);
    });
});
