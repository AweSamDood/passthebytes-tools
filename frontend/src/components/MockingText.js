import React, { useState } from 'react';
import {
    Box,
    Button,
    Container,
    Paper,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
    Alert,
    IconButton,
    InputAdornment,
    CircularProgress,
    Chip
} from '@mui/material';
import { ContentCopy, Clear, TextFields } from '@mui/icons-material';
import { generateMockingText } from '../utils/api';

const MockingText = () => {
    const [text, setText] = useState('');
    const [startWithLowercase, setStartWithLowercase] = useState(false);
    const [mockedText, setMockedText] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleGenerate = async () => {
        if (!text.trim()) {
            setError('Please enter some text to mock');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await generateMockingText(text, startWithLowercase);
            setMockedText(response.result);
        } catch (err) {
            setError('Failed to generate mocking text. Please try again.');
            setMockedText('');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!mockedText) return;

        try {
            await navigator.clipboard.writeText(mockedText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    };

    const handleClear = () => {
        setText('');
        setMockedText('');
        setError('');
        setCopied(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleGenerate();
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h3" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                    <TextFields sx={{ fontSize: 'inherit' }} />
                    Mocking Text Generator
                </Typography>
                <Typography variant="h6" color="text.secondary">
                    tUrN yOuR tExT iNtO sArCaStIc MoCkInG tExT
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Input Text
                </Typography>

                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    variant="outlined"
                    placeholder="Type something that deserves to be mocked..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    inputProps={{ maxLength: 1000 }}
                    helperText={`${text.length}/1000 characters`}
                    sx={{ mb: 2 }}
                />

                <Box sx={{ mb: 3 }}>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={startWithLowercase}
                                onChange={(e) => setStartWithLowercase(e.target.checked)}
                                color="primary"
                            />
                        }
                        label="Start with lowercase"
                    />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button
                        variant="contained"
                        onClick={handleGenerate}
                        disabled={isLoading || !text.trim()}
                        startIcon={isLoading ? <CircularProgress size={20} /> : <TextFields />}
                        sx={{ minWidth: 200 }}
                    >
                        {isLoading ? 'Generating...' : 'Generate Mock Text'}
                    </Button>

                    {text && (
                        <Button
                            variant="outlined"
                            onClick={handleClear}
                            startIcon={<Clear />}
                            color="secondary"
                        >
                            Clear
                        </Button>
                    )}
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>

            {mockedText && (
                <Paper elevation={3} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6">
                            Your Mocked Text
                        </Typography>
                        <Chip
                            label={copied ? "Copied!" : "Copy"}
                            icon={<ContentCopy />}
                            onClick={handleCopy}
                            clickable
                            color={copied ? "success" : "primary"}
                            variant={copied ? "filled" : "outlined"}
                        />
                    </Box>

                    <TextField
                        fullWidth
                        multiline
                        variant="outlined"
                        value={mockedText}
                        InputProps={{
                            readOnly: true,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton onClick={handleCopy} edge="end" title="Copy to clipboard">
                                        <ContentCopy />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                        sx={{
                            '& .MuiInputBase-input': {
                                fontStyle: 'italic',
                                fontSize: '1.1rem',
                                fontFamily: 'serif'
                            }
                        }}
                    />
                </Paper>
            )}

            <Box sx={{ mt: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                    💡 <strong>Tip:</strong> Press <kbd>Ctrl + Enter</kbd> to quickly generate
                </Typography>
            </Box>
        </Container>
    );
};

export default MockingText;
