// src/components/AudioTrimmer/AudioTrimmer.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
    Alert,
    Box,
    Button,
    Chip,
    CircularProgress,
    Container,
    Divider,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import {
    CloudUpload,
    ContentCut,
    Download,
    PlayArrow,
    Restore,
    Stop,
} from '@mui/icons-material';

import Waveform from './Waveform';
import TimeInput from './TimeInput';
import {
    buildOutputChannels,
    clamp,
    computePeaks,
    decodeAudioFile,
    encodeWav,
    formatTime,
    outputDuration,
} from './audioUtils';
import { probeAudio, trimAudio } from '../../utils/api';

const MAX_FILE_SIZE = 90 * 1024 * 1024; // matches the backend cap
const FALLBACK_PEAKS = 1600;
// Apple's limit for a ringtone; longer files import as music instead.
const RINGTONE_MAX_SECONDS = 40;

const OUTPUT_FORMATS = [
    { value: 'wav', label: 'WAV (lossless)', lossy: false },
    { value: 'mp3', label: 'MP3', lossy: true },
    { value: 'm4a', label: 'M4A (AAC)', lossy: true },
    { value: 'm4r', label: 'M4R (iPhone ringtone)', lossy: true },
];

const BITRATES = [128, 192, 320];

const ACCEPTED_FILES = {
    'audio/*': ['.mp3', '.wav', '.flac', '.m4a', '.aac', '.ogg', '.oga', '.opus'],
};

const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

function AudioTrimmer() {
    const [file, setFile] = useState(null);
    const [audioBuffer, setAudioBuffer] = useState(null);
    const [peaks, setPeaks] = useState(null);
    const [duration, setDuration] = useState(0);
    // Set when the browser cannot decode the file and the server drew the
    // waveform instead: the selection still works, but preview does not.
    const [serverOnly, setServerOnly] = useState(false);

    const [start, setStart] = useState(0);
    const [end, setEnd] = useState(0);
    const [mode, setMode] = useState('keep');

    const [outputFormat, setOutputFormat] = useState('mp3');
    const [bitrate, setBitrate] = useState(192);

    const [playhead, setPlayhead] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState(null);
    const [notice, setNotice] = useState(null);
    const [result, setResult] = useState(null);

    const audioContextRef = useRef(null);
    const sourcesRef = useRef([]);
    const playbackIdRef = useRef(0);
    const rafRef = useRef(null);
    const resultUrlRef = useRef(null);

    // Created on first play: browsers refuse to start one before a gesture.
    const ensureContext = useCallback(() => {
        if (!audioContextRef.current) {
            const Ctor = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new Ctor();
        }
        return audioContextRef.current;
    }, []);

    const stopPlayback = useCallback(() => {
        playbackIdRef.current += 1;
        sourcesRef.current.forEach((source) => {
            try {
                source.stop();
            } catch (e) {
                // Already finished; nothing to stop.
            }
            source.disconnect();
        });
        sourcesRef.current = [];

        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        setIsPlaying(false);
    }, []);

    // Segments are expressed against the original timeline, which lets the
    // playhead stay meaningful even when 'remove' stitches two pieces together.
    const buildSegments = useCallback((pieces) => {
        let offset = 0;
        return pieces
            .filter((piece) => piece.length > 0.001)
            .map((piece) => {
                const segment = { ...piece, offset };
                offset += piece.length;
                return segment;
            });
    }, []);

    const startPlayback = useCallback(
        (segments) => {
            if (!audioBuffer || !segments.length) return;

            const total = segments.reduce((sum, segment) => sum + segment.length, 0);
            if (total <= 0.001) return;

            stopPlayback();

            const context = ensureContext();
            if (context.state === 'suspended') context.resume();

            const playbackId = playbackIdRef.current;
            const startedAt = context.currentTime + 0.06;

            segments.forEach((segment) => {
                const source = context.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(context.destination);
                source.start(startedAt + segment.offset, segment.from, segment.length);
                sourcesRef.current.push(source);
            });

            setIsPlaying(true);

            const tick = () => {
                if (playbackIdRef.current !== playbackId) return;

                const elapsed = context.currentTime - startedAt;

                if (elapsed >= total) {
                    const last = segments[segments.length - 1];
                    setPlayhead(last.from + last.length);
                    stopPlayback();
                    return;
                }

                const position = Math.max(0, elapsed);
                const segment =
                    segments.find(
                        (candidate) =>
                            position >= candidate.offset &&
                            position < candidate.offset + candidate.length
                    ) || segments[0];

                setPlayhead(segment.from + (position - segment.offset));
                rafRef.current = requestAnimationFrame(tick);
            };

            rafRef.current = requestAnimationFrame(tick);
        },
        [audioBuffer, stopPlayback, ensureContext]
    );

    const playSelection = useCallback(() => {
        const pieces =
            mode === 'keep'
                ? [{ from: start, length: end - start }]
                : [
                      { from: 0, length: start },
                      { from: end, length: duration - end },
                  ];

        startPlayback(buildSegments(pieces));
    }, [mode, start, end, duration, startPlayback, buildSegments]);

    const playFullTrack = useCallback(() => {
        const from = playhead >= duration - 0.01 ? 0 : playhead;
        startPlayback(buildSegments([{ from, length: duration - from }]));
    }, [playhead, duration, startPlayback, buildSegments]);

    const togglePlayback = useCallback(() => {
        if (isPlaying) {
            stopPlayback();
        } else {
            playSelection();
        }
    }, [isPlaying, stopPlayback, playSelection]);

    // Space toggles preview, the way every other audio editor behaves.
    useEffect(() => {
        if (!audioBuffer) return undefined;

        const onKeyDown = (event) => {
            if (event.code !== 'Space' && event.key !== ' ') return;

            const target = event.target;
            const tag = target && target.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || (target && target.isContentEditable)) {
                return;
            }

            event.preventDefault();
            togglePlayback();
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [audioBuffer, togglePlayback]);

    useEffect(() => stopPlayback, [stopPlayback]);

    useEffect(
        () => () => {
            if (resultUrlRef.current) URL.revokeObjectURL(resultUrlRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        },
        []
    );

    const clearResult = () => {
        if (resultUrlRef.current) {
            URL.revokeObjectURL(resultUrlRef.current);
            resultUrlRef.current = null;
        }
        setResult(null);
    };

    const resetAll = () => {
        stopPlayback();
        clearResult();
        setFile(null);
        setAudioBuffer(null);
        setPeaks(null);
        setDuration(0);
        setServerOnly(false);
        setStart(0);
        setEnd(0);
        setMode('keep');
        setPlayhead(0);
        setError(null);
        setNotice(null);
    };

    const loadFile = useCallback(async (selected) => {
        stopPlayback();
        clearResult();
        setError(null);
        setNotice(null);
        setAudioBuffer(null);
        setPeaks(null);
        setServerOnly(false);
        setPlayhead(0);
        setFile(selected);
        setIsLoading(true);

        try {
            const buffer = await decodeAudioFile(selected);
            setAudioBuffer(buffer);
            setPeaks(computePeaks(buffer));
            setDuration(buffer.duration);
            setStart(0);
            setEnd(buffer.duration);
        } catch (decodeError) {
            // The browser has no decoder for this format. ffmpeg on the server
            // does, so fall back to it for the waveform and for exporting.
            try {
                const info = await probeAudio(selected, FALLBACK_PEAKS);
                setPeaks(Float32Array.from(info.peaks));
                setDuration(info.duration);
                setStart(0);
                setEnd(info.duration);
                setServerOnly(true);
                setNotice(
                    'Your browser cannot decode this format, so the waveform came from the ' +
                        'server and preview is unavailable. Trimming still works.'
                );
            } catch (probeError) {
                setFile(null);
                setDuration(0);
                setError(
                    probeError.message ||
                        'Could not read this audio file. It may be corrupt or in an unsupported format.'
                );
            }
        } finally {
            setIsLoading(false);
        }
    }, [stopPlayback]);

    const onDrop = useCallback(
        (acceptedFiles, rejections) => {
            if (rejections && rejections.length) {
                const rejection = rejections[0];
                const tooBig = rejection.errors.some((e) => e.code === 'file-too-large');
                setError(
                    tooBig
                        ? `That file is larger than ${MAX_FILE_SIZE / (1024 * 1024)} MB.`
                        : 'That file is not a supported audio format.'
                );
                return;
            }

            if (acceptedFiles.length) loadFile(acceptedFiles[0]);
        },
        [loadFile]
    );

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: ACCEPTED_FILES,
        multiple: false,
        maxSize: MAX_FILE_SIZE,
    });

    const handleSelectionChange = useCallback(
        (nextStart, nextEnd) => {
            setStart(clamp(nextStart, 0, duration));
            setEnd(clamp(nextEnd, 0, duration));
            clearResult();
        },
        [duration]
    );

    const exportedSeconds = outputDuration(start, end, mode, duration);
    const selectedFormat = OUTPUT_FORMATS.find((entry) => entry.value === outputFormat);
    // WAV is the one format the browser can write itself.
    const processedLocally = outputFormat === 'wav' && !!audioBuffer;

    const handleExport = async () => {
        if (!file || exportedSeconds <= 0) return;

        stopPlayback();
        clearResult();
        setError(null);
        setIsExporting(true);

        try {
            let blob;
            let filename;

            const baseName = file.name.replace(/\.[^.]+$/, '') || 'audio';

            if (processedLocally) {
                const { channels, sampleRate } = buildOutputChannels(
                    audioBuffer,
                    start,
                    end,
                    mode
                );

                if (!channels.length || !channels[0].length) {
                    throw new Error('That selection would produce an empty file.');
                }

                blob = encodeWav(channels, sampleRate);
                filename = `${baseName}_trimmed.wav`;
            } else {
                const response = await trimAudio(file, {
                    start,
                    end,
                    mode,
                    outputFormat,
                    bitrate,
                });
                blob = response.blob;
                filename = response.filename;
            }

            const url = URL.createObjectURL(blob);
            resultUrlRef.current = url;
            setResult({ url, filename, size: blob.size });
        } catch (exportError) {
            setError(exportError.message || 'Trimming failed. Please try again.');
        } finally {
            setIsExporting(false);
        }
    };

    const ringtoneTooLong =
        outputFormat === 'm4r' && exportedSeconds > RINGTONE_MAX_SECONDS;

    const hasAudio = !!file && duration > 0 && !!peaks;

    const summary = useMemo(() => {
        if (!hasAudio) return null;
        return mode === 'keep'
            ? `Keeping ${formatTime(start)} to ${formatTime(end)}`
            : `Removing ${formatTime(start)} to ${formatTime(end)}`;
    }, [hasAudio, mode, start, end]);

    return (
        <Container maxWidth="lg">
            <Typography variant="h4" gutterBottom align="center" sx={{ mb: 1 }}>
                Audio Trimmer
            </Typography>
            <Typography
                variant="body2"
                align="center"
                color="text.secondary"
                sx={{ mb: 4 }}
            >
                Cut a clip out of an audio file, or cut a section out of the middle.
                Decoding, the waveform, preview and WAV export all happen in your browser.
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}
            {notice && (
                <Alert severity="info" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
                    {notice}
                </Alert>
            )}

            {!hasAudio && (
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Box
                        {...getRootProps()}
                        sx={{
                            border: '2px dashed',
                            borderColor: isDragActive ? 'primary.main' : 'grey.400',
                            borderRadius: 2,
                            p: 5,
                            textAlign: 'center',
                            cursor: 'pointer',
                            backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                            transition: 'all 0.2s ease-in-out',
                            '&:hover': {
                                borderColor: 'primary.main',
                                backgroundColor: 'action.hover',
                            },
                        }}
                    >
                        <input {...getInputProps()} />
                        {isLoading ? (
                            <>
                                <CircularProgress sx={{ mb: 2 }} />
                                <Typography variant="h6">Reading audio…</Typography>
                            </>
                        ) : (
                            <>
                                <CloudUpload
                                    sx={{ fontSize: 48, color: 'primary.main', mb: 2 }}
                                />
                                <Typography variant="h6" gutterBottom>
                                    {isDragActive
                                        ? 'Drop the audio file here…'
                                        : 'Drag & drop an audio file here'}
                                </Typography>
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mb: 2 }}
                                >
                                    Or click to browse files
                                </Typography>
                                <Button variant="outlined" component="span">
                                    Choose File
                                </Button>
                                <Typography
                                    variant="caption"
                                    display="block"
                                    sx={{ mt: 2 }}
                                >
                                    MP3, WAV, FLAC, M4A, AAC, OGG, Opus (max{' '}
                                    {MAX_FILE_SIZE / (1024 * 1024)} MB)
                                </Typography>
                            </>
                        )}
                    </Box>
                </Paper>
            )}

            {hasAudio && (
                <>
                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1}
                            alignItems={{ sm: 'center' }}
                            justifyContent="space-between"
                            sx={{ mb: 2 }}
                        >
                            <Box sx={{ minWidth: 0 }}>
                                <Typography variant="subtitle1" noWrap title={file.name}>
                                    {file.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {formatTime(duration)} · {formatBytes(file.size)}
                                </Typography>
                            </Box>
                            <Button
                                size="small"
                                startIcon={<Restore />}
                                onClick={resetAll}
                            >
                                Start over
                            </Button>
                        </Stack>

                        <Waveform
                            peaks={peaks}
                            duration={duration}
                            start={start}
                            end={end}
                            mode={mode}
                            playhead={playhead}
                            onSelectionChange={handleSelectionChange}
                            onSeek={(time) => {
                                stopPlayback();
                                setPlayhead(time);
                            }}
                        />

                        <Stack
                            direction="row"
                            spacing={1}
                            alignItems="center"
                            justifyContent="space-between"
                            sx={{ mt: 1 }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                0:00.000
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatTime(duration)}
                            </Typography>
                        </Stack>

                        <Divider sx={{ my: 2 }} />

                        <Grid container spacing={2} alignItems="flex-start">
                            <Grid item xs={6} sm={3}>
                                <TimeInput
                                    label="Start"
                                    value={start}
                                    min={0}
                                    max={end}
                                    onChange={(value) => handleSelectionChange(value, end)}
                                />
                            </Grid>
                            <Grid item xs={6} sm={3}>
                                <TimeInput
                                    label="End"
                                    value={end}
                                    min={start}
                                    max={duration}
                                    onChange={(value) => handleSelectionChange(start, value)}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <ToggleButtonGroup
                                    value={mode}
                                    exclusive
                                    fullWidth
                                    size="small"
                                    onChange={(event, value) => {
                                        if (value) {
                                            setMode(value);
                                            clearResult();
                                        }
                                    }}
                                >
                                    <ToggleButton value="keep">Keep selection</ToggleButton>
                                    <ToggleButton value="remove">
                                        Remove selection
                                    </ToggleButton>
                                </ToggleButtonGroup>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                    sx={{ mt: 0.5 }}
                                >
                                    Drag the edges, or focus a handle and use ← → (Shift for
                                    1&nbsp;second steps).
                                </Typography>
                            </Grid>
                        </Grid>

                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            useFlexGap
                            sx={{ mt: 2 }}
                        >
                            {/* Playback always restarts from the top of the
                                result, so this stops rather than pauses. */}
                            <Button
                                variant="contained"
                                startIcon={isPlaying ? <Stop /> : <PlayArrow />}
                                onClick={togglePlayback}
                                disabled={serverOnly || exportedSeconds <= 0}
                            >
                                {isPlaying ? 'Stop' : 'Preview result'}
                            </Button>
                            <Button
                                variant="outlined"
                                startIcon={<PlayArrow />}
                                onClick={playFullTrack}
                                disabled={serverOnly}
                            >
                                Play full track
                            </Button>
                            <Box sx={{ flexGrow: 1 }} />
                            <Chip
                                label={`${summary} · ${formatTime(exportedSeconds)} out`}
                                color={mode === 'keep' ? 'primary' : 'error'}
                                variant="outlined"
                            />
                        </Stack>
                        {!serverOnly && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 1 }}
                            >
                                Press Space to play or pause the result. Click the waveform to
                                move the playhead.
                            </Typography>
                        )}
                    </Paper>

                    <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 } }}>
                        <Typography variant="h6" gutterBottom>
                            Export
                        </Typography>

                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12} sm={5}>
                                <FormControl fullWidth size="small">
                                    <InputLabel id="audio-output-format">Format</InputLabel>
                                    <Select
                                        labelId="audio-output-format"
                                        label="Format"
                                        value={outputFormat}
                                        onChange={(event) => {
                                            setOutputFormat(event.target.value);
                                            clearResult();
                                        }}
                                    >
                                        {OUTPUT_FORMATS.map((entry) => (
                                            <MenuItem key={entry.value} value={entry.value}>
                                                {entry.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>

                            {selectedFormat && selectedFormat.lossy && (
                                <Grid item xs={12} sm={3}>
                                    <FormControl fullWidth size="small">
                                        <InputLabel id="audio-bitrate">Bitrate</InputLabel>
                                        <Select
                                            labelId="audio-bitrate"
                                            label="Bitrate"
                                            value={bitrate}
                                            onChange={(event) => {
                                                setBitrate(event.target.value);
                                                clearResult();
                                            }}
                                        >
                                            {BITRATES.map((value) => (
                                                <MenuItem key={value} value={value}>
                                                    {value} kbps
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                            )}

                            <Grid item xs={12} sm>
                                <Chip
                                    size="small"
                                    label={
                                        processedLocally
                                            ? 'Processed in your browser'
                                            : 'Encoded on the server'
                                    }
                                    color={processedLocally ? 'success' : 'default'}
                                    variant="outlined"
                                />
                            </Grid>
                        </Grid>

                        {ringtoneTooLong && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                                iPhone ringtones must be {RINGTONE_MAX_SECONDS} seconds or
                                shorter. This selection is {formatTime(exportedSeconds)}.
                            </Alert>
                        )}

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            alignItems={{ sm: 'center' }}
                            sx={{ mt: 3 }}
                        >
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={
                                    isExporting ? (
                                        <CircularProgress size={20} color="inherit" />
                                    ) : (
                                        <ContentCut />
                                    )
                                }
                                onClick={handleExport}
                                disabled={isExporting || exportedSeconds <= 0}
                            >
                                {isExporting ? 'Trimming…' : 'Trim audio'}
                            </Button>

                            {result && (
                                <Button
                                    variant="outlined"
                                    size="large"
                                    startIcon={<Download />}
                                    component="a"
                                    href={result.url}
                                    download={result.filename}
                                >
                                    Download {result.filename} ({formatBytes(result.size)})
                                </Button>
                            )}
                        </Stack>

                        {!processedLocally && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                sx={{ mt: 2 }}
                            >
                                MP3, M4A and M4R are encoded on the server. Your file is
                                deleted as soon as the trimmed copy is sent back.
                            </Typography>
                        )}
                    </Paper>
                </>
            )}
        </Container>
    );
}

export default AudioTrimmer;
