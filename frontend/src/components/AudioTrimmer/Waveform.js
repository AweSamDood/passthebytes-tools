// src/components/AudioTrimmer/Waveform.js
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { clamp, formatTime } from './audioUtils';

const HEIGHT = 168;
const BAR_WIDTH = 2;
const BAR_GAP = 1;
const HANDLE_WIDTH = 12;

/**
 * Waveform with a draggable selection.
 *
 * The bars are painted on a canvas; the selection edges are real focusable
 * elements on top of it, so they can be tabbed to and nudged with the arrow
 * keys rather than only dragged.
 */
function Waveform({
    peaks,
    duration,
    start,
    end,
    mode,
    playhead,
    onSelectionChange,
    onSeek,
    disabled = false,
}) {
    const theme = useTheme();
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const dragRef = useRef(null);
    const [width, setWidth] = useState(0);

    // Track the rendered width so the canvas stays sharp through resizes.
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return undefined;

        const observer = new ResizeObserver((entries) => {
            setWidth(Math.floor(entries[0].contentRect.width));
        });
        observer.observe(container);
        setWidth(Math.floor(container.getBoundingClientRect().width));

        return () => observer.disconnect();
    }, []);

    const selectionColor =
        mode === 'keep' ? theme.palette.primary.main : theme.palette.error.main;
    const baseColor = theme.palette.text.disabled;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !width || !peaks || !peaks.length) return;

        const ratio = window.devicePixelRatio || 1;
        canvas.width = width * ratio;
        canvas.height = HEIGHT * ratio;

        const ctx = canvas.getContext('2d');
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.clearRect(0, 0, width, HEIGHT);

        const step = BAR_WIDTH + BAR_GAP;
        const barCount = Math.max(1, Math.floor(width / step));
        const middle = HEIGHT / 2;
        const startRatio = duration > 0 ? start / duration : 0;
        const endRatio = duration > 0 ? end / duration : 0;

        for (let i = 0; i < barCount; i += 1) {
            // Each bar covers a slice of the peak array, not a single entry,
            // so nothing is dropped when there are more peaks than pixels.
            const from = Math.floor((i / barCount) * peaks.length);
            const to = Math.max(from + 1, Math.floor(((i + 1) / barCount) * peaks.length));

            let peak = 0;
            for (let j = from; j < to && j < peaks.length; j += 1) {
                if (peaks[j] > peak) peak = peaks[j];
            }

            const barRatio = (i + 0.5) / barCount;
            const inSelection = barRatio >= startRatio && barRatio <= endRatio;

            // A bar of at least 1px keeps silence visible as a centre line.
            const barHeight = Math.max(1, peak * (HEIGHT - 8));
            ctx.fillStyle = inSelection ? selectionColor : baseColor;
            ctx.globalAlpha = inSelection ? 1 : 0.45;
            ctx.fillRect(i * step, middle - barHeight / 2, BAR_WIDTH, barHeight);
        }

        ctx.globalAlpha = 1;
    }, [peaks, width, start, end, duration, selectionColor, baseColor]);

    const timeFromClientX = useCallback(
        (clientX) => {
            const container = containerRef.current;
            if (!container || duration <= 0) return 0;

            const rect = container.getBoundingClientRect();
            const ratio = rect.width > 0 ? (clientX - rect.left) / rect.width : 0;
            return clamp(ratio * duration, 0, duration);
        },
        [duration]
    );

    const handlePointerMove = useCallback(
        (event) => {
            const drag = dragRef.current;
            if (!drag) return;

            const time = timeFromClientX(event.clientX);

            if (drag.type === 'start') {
                onSelectionChange(Math.min(time, end), end);
            } else if (drag.type === 'end') {
                onSelectionChange(start, Math.max(time, start));
            } else if (drag.type === 'region') {
                const span = drag.end - drag.start;
                const nextStart = clamp(time - drag.grab, 0, duration - span);
                onSelectionChange(nextStart, nextStart + span);
            }
        },
        [duration, end, start, onSelectionChange, timeFromClientX]
    );

    const endDrag = useCallback(() => {
        dragRef.current = null;
    }, []);

    useEffect(() => {
        if (disabled) return undefined;

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', endDrag);
        window.addEventListener('pointercancel', endDrag);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', endDrag);
            window.removeEventListener('pointercancel', endDrag);
        };
    }, [disabled, handlePointerMove, endDrag]);

    const beginDrag = (type) => (event) => {
        if (disabled) return;
        event.preventDefault();
        event.stopPropagation();
        dragRef.current = {
            type,
            start,
            end,
            grab: timeFromClientX(event.clientX) - start,
        };
    };

    const handleBackgroundPointerDown = (event) => {
        if (disabled || !onSeek) return;
        onSeek(timeFromClientX(event.clientX));
    };

    const nudge = (edge) => (event) => {
        if (disabled) return;

        const step = event.shiftKey ? 1 : 0.01;
        let delta = 0;
        if (event.key === 'ArrowLeft') delta = -step;
        else if (event.key === 'ArrowRight') delta = step;
        else if (event.key === 'Home') delta = edge === 'start' ? -start : -end;
        else if (event.key === 'End') delta = duration - (edge === 'start' ? start : end);
        else return;

        event.preventDefault();
        if (edge === 'start') {
            onSelectionChange(clamp(start + delta, 0, end), end);
        } else {
            onSelectionChange(start, clamp(end + delta, start, duration));
        }
    };

    const percent = (time) => (duration > 0 ? clamp(time / duration, 0, 1) * 100 : 0);

    const startPercent = percent(start);
    const endPercent = percent(end);

    const handleSx = {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: `${HANDLE_WIDTH}px`,
        marginLeft: `${-HANDLE_WIDTH / 2}px`,
        cursor: disabled ? 'default' : 'ew-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        touchAction: 'none',
        '&:focus-visible': {
            outline: `2px solid ${theme.palette.secondary.main}`,
            outlineOffset: '2px',
        },
        '&::after': {
            content: '""',
            width: '3px',
            height: '100%',
            backgroundColor: selectionColor,
            borderRadius: '2px',
        },
    };

    return (
        <Box
            ref={containerRef}
            onPointerDown={handleBackgroundPointerDown}
            sx={{
                position: 'relative',
                height: `${HEIGHT}px`,
                width: '100%',
                borderRadius: 1,
                overflow: 'hidden',
                backgroundColor: theme.palette.action.hover,
                cursor: disabled ? 'default' : 'pointer',
                touchAction: 'none',
                userSelect: 'none',
            }}
        >
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: `${HEIGHT}px`, display: 'block' }}
            />

            {/* Shade whatever will not survive the export. */}
            {[
                { left: 0, width: startPercent },
                { left: endPercent, width: 100 - endPercent },
            ].map(({ left, width: shadeWidth }, index) => (
                <Box
                    key={index}
                    sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${left}%`,
                        width: `${shadeWidth}%`,
                        backgroundColor:
                            mode === 'keep' ? 'rgba(0, 0, 0, 0.32)' : 'transparent',
                        pointerEvents: 'none',
                    }}
                />
            ))}
            {mode === 'remove' && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${startPercent}%`,
                        width: `${endPercent - startPercent}%`,
                        backgroundColor: 'rgba(0, 0, 0, 0.32)',
                        pointerEvents: 'none',
                    }}
                />
            )}

            <Box
                onPointerDown={beginDrag('region')}
                sx={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${startPercent}%`,
                    width: `${Math.max(0, endPercent - startPercent)}%`,
                    cursor: disabled ? 'default' : 'grab',
                    borderTop: `2px solid ${selectionColor}`,
                    borderBottom: `2px solid ${selectionColor}`,
                    touchAction: 'none',
                }}
            />

            {playhead !== null && playhead !== undefined && (
                <Box
                    sx={{
                        position: 'absolute',
                        top: 0,
                        bottom: 0,
                        left: `${percent(playhead)}%`,
                        width: '2px',
                        backgroundColor: theme.palette.text.primary,
                        pointerEvents: 'none',
                    }}
                />
            )}

            <Box
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label="Selection start"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={start}
                aria-valuetext={formatTime(start)}
                onPointerDown={beginDrag('start')}
                onKeyDown={nudge('start')}
                sx={{ ...handleSx, left: `${startPercent}%` }}
            />
            <Box
                role="slider"
                tabIndex={disabled ? -1 : 0}
                aria-label="Selection end"
                aria-valuemin={0}
                aria-valuemax={duration}
                aria-valuenow={end}
                aria-valuetext={formatTime(end)}
                onPointerDown={beginDrag('end')}
                onKeyDown={nudge('end')}
                sx={{ ...handleSx, left: `${endPercent}%` }}
            />
        </Box>
    );
}

export default Waveform;
