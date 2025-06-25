import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    FormControlLabel,
    FormLabel,
    Grid,
    Paper,
    Slider,
    Switch,
    TextField,
    Typography,
    Select,
    MenuItem,
    InputLabel,
    InputAdornment,
    IconButton
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { generatePassword as generatePasswordApi } from '../../utils/api';

function PasswordGenerator() {
    const [passwordLength, setPasswordLength] = useState(12);
    const [includeUppercase, setIncludeUppercase] = useState(true);
    const [includeLowercase, setIncludeLowercase] = useState(true);
    const [includeNumbers, setIncludeNumbers] = useState(true);
    const [includeSymbols, setIncludeSymbols] = useState(true);
    const [minNumbers, setMinNumbers] = useState(1);
    const [minSymbols, setMinSymbols] = useState(1);
    const [generatedPassword, setGeneratedPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!includeNumbers) {
            setMinNumbers(0);
        } else {
            setMinNumbers(1);
        }
    }, [includeNumbers]);

    useEffect(() => {
        if (!includeSymbols) {
            setMinSymbols(0);
        } else {
            setMinSymbols(1);
        }
    }, [includeSymbols]);

    useEffect(() => {
        const totalMins = minNumbers + minSymbols;
        if (passwordLength < totalMins) {
            setPasswordLength(totalMins);
        }
    }, [minNumbers, minSymbols, passwordLength]);

    const handleSliderChange = (event, newValue) => {
        setPasswordLength(newValue);
    };

    const handleInputChange = (event) => {
        let value = event.target.value === '' ? '' : Number(event.target.value);
        if (value > 128) {
            value = 128;
        }
        setPasswordLength(value);
    };

    const handleGeneratePassword = async () => {
        if (passwordLength < 6) {
            setError("Password length must be at least 6 characters.");
            return;
        }

        const totalMins = minNumbers + minSymbols;
        if (totalMins > passwordLength) {
            setError("The sum of minimum numbers and symbols cannot exceed the password length.");
            return;
        }
        if (!includeUppercase && !includeLowercase && !includeNumbers && !includeSymbols) {
            setError("At least one character type must be selected.");
            return;
        }


        setIsLoading(true);
        setError(null);
        try {
            const response = await generatePasswordApi({
                length: passwordLength,
                include_uppercase: includeUppercase,
                include_lowercase: includeLowercase,
                include_numbers: includeNumbers,
                include_symbols: includeSymbols,
                min_numbers: minNumbers,
                min_symbols: minSymbols
            });
            setGeneratedPassword(response.password);
        } catch (err) {
            setError('An error occurred during password generation.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedPassword);
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                Password Generator
            </Typography>
            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography gutterBottom>Password Length:</Typography>
                            <TextField
                                value={passwordLength}
                                onChange={handleInputChange}
                                type="number"
                                inputProps={{
                                    min: 6,
                                    max: 128,
                                    'aria-labelledby': 'input-slider',
                                }}
                                sx={{ width: '80px' }}
                            />
                        </Box>
                        <Slider
                            value={typeof passwordLength === 'number' ? passwordLength : 6}
                            onChange={handleSliderChange}
                            aria-labelledby="input-slider"
                            min={6}
                            max={128}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Character Types</FormLabel>
                            <FormControlLabel
                                control={<Switch checked={includeUppercase} onChange={(e) => setIncludeUppercase(e.target.checked)} />}
                                label="Uppercase (A-Z)"
                            />
                            <FormControlLabel
                                control={<Switch checked={includeLowercase} onChange={(e) => setIncludeLowercase(e.target.checked)} />}
                                label="Lowercase (a-z)"
                            />
                            <FormControlLabel
                                control={<Switch checked={includeNumbers} onChange={(e) => setIncludeNumbers(e.target.checked)} />}
                                label="Numbers (0-9)"
                            />
                            <FormControlLabel
                                control={<Switch checked={includeSymbols} onChange={(e) => setIncludeSymbols(e.target.checked)} />}
                                label="Symbols (!@#$%^&*)"
                            />
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel id="min-numbers-label">Minimum Numbers</InputLabel>
                            <Select
                                labelId="min-numbers-label"
                                value={minNumbers}
                                label="Minimum Numbers"
                                onChange={(e) => setMinNumbers(e.target.value)}
                                disabled={!includeNumbers}
                            >
                                {[...Array(11).keys()].map(n => (
                                    <MenuItem key={n} value={n}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth>
                            <InputLabel id="min-symbols-label">Minimum Symbols</InputLabel>
                            <Select
                                labelId="min-symbols-label"
                                value={minSymbols}
                                label="Minimum Symbols"
                                onChange={(e) => setMinSymbols(e.target.value)}
                                disabled={!includeSymbols}
                            >
                                {[...Array(11).keys()].map(n => (
                                    <MenuItem key={n} value={n}>{n}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleGeneratePassword}
                            disabled={isLoading}
                            fullWidth
                        >
                            {isLoading ? 'Generating...' : 'Generate Password'}
                        </Button>
                    </Grid>
                    {generatedPassword && (
                        <Grid item xs={12}>
                            <TextField
                                value={generatedPassword}
                                InputProps={{
                                    readOnly: true,
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton onClick={handleCopy} edge="end">
                                                <ContentCopy />
                                            </IconButton>
                                        </InputAdornment>
                                    )
                                }}
                                fullWidth
                                label="Generated Password"
                            />
                        </Grid>
                    )}
                    {error && (
                        <Grid item xs={12}>
                            <Typography color="error" align="center">{error}</Typography>
                        </Grid>
                    )}
                </Grid>
            </Paper>
        </Container>
    );
}

export default PasswordGenerator;
