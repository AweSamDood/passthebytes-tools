// src/components/AudioTrimmer/TimeInput.js
import React, { useEffect, useRef, useState } from 'react';
import { TextField } from '@mui/material';
import { clamp, formatTime, parseTime } from './audioUtils';

/**
 * A text field holding a time as M:SS.mmm.
 *
 * Typing is left alone until the field is committed (blur or Enter), so a
 * half-typed value never yanks the selection around.
 */
function TimeInput({ label, value, onChange, min = 0, max = Infinity, disabled = false }) {
    const [text, setText] = useState(() => formatTime(value));
    const [invalid, setInvalid] = useState(false);
    const focusedRef = useRef(false);

    useEffect(() => {
        if (!focusedRef.current) {
            setText(formatTime(value));
            setInvalid(false);
        }
    }, [value]);

    const commit = () => {
        const parsed = parseTime(text);

        if (parsed === null) {
            setInvalid(true);
            return;
        }

        setInvalid(false);
        const next = clamp(parsed, min, max);
        setText(formatTime(next));
        onChange(next);
    };

    return (
        <TextField
            label={label}
            value={text}
            disabled={disabled}
            error={invalid}
            helperText={invalid ? 'Use M:SS.mmm' : ' '}
            size="small"
            fullWidth
            inputProps={{ inputMode: 'decimal', spellCheck: 'false' }}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => {
                focusedRef.current = true;
            }}
            onBlur={() => {
                focusedRef.current = false;
                commit();
            }}
            onKeyDown={(event) => {
                // Space belongs to the field here, not to the play shortcut.
                event.stopPropagation();
                if (event.key === 'Enter') {
                    event.preventDefault();
                    commit();
                }
            }}
        />
    );
}

export default TimeInput;
