import React, { useState, useEffect, useCallback } from 'react';
import {
    Grid, Paper, Tabs, Tab, TextField, Button, Slider, Typography, Box,
    FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel
} from '@mui/material';
import { debounce } from 'lodash';
import { generateQRCode } from '../../utils/api';

const QrCodeGenerator = () => {
    const [qrConfig, setQrConfig] = useState({
        qr_type: 'url',
        content: {
            url: 'https://github.com/AweSamDood/passthebytes-tools'
        },
        customization: {
            size: 400,
            foreground_color: '#000000',
            background_color: '#ffffff',
            error_correction: 'M',
            border_size: 4,
        },
    });
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [logoFile, setLogoFile] = useState(null);

    const debouncedGenerateQr = useCallback(
        debounce(async (config, logo) => {
            try {
                setLoading(true);
                setError(null);
                const imageBlob = await generateQRCode(config, logo);
                setQrCodeImage(URL.createObjectURL(imageBlob));
            } catch (err) {
                setError('Failed to generate QR code. Please check the inputs.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        }, 500),
        []
    );

    useEffect(() => {
        debouncedGenerateQr(qrConfig, logoFile);
        return () => debouncedGenerateQr.cancel();
    }, [qrConfig, logoFile, debouncedGenerateQr]);

    const handleTabChange = (event, newValue) => {
        let content = {};
        if (newValue === 'url') content = { url: '' };
        if (newValue === 'text') content = { text: '' };
        if (newValue === 'wifi') content = { ssid: '', password: '', security: 'WPA', hidden: false };
        if (newValue === 'contact') content = { first_name: '', last_name: '', phone: '', email: '' };
        if (newValue === 'email') content = { email: '', subject: '', body: '' };

        setQrConfig(prev => ({ ...prev, qr_type: newValue, content }));
    };

    const handleContentChange = (e) => {
        const { name, value, type, checked } = e.target;
        setQrConfig(prev => ({
            ...prev,
            content: {
                ...prev.content,
                [name]: type === 'checkbox' ? checked : value,
            }
        }));
    };

    const handleCustomizationChange = (name, value) => {
        setQrConfig(prev => ({
            ...prev,
            customization: {
                ...prev.customization,
                [name]: value,
            }
        }));
    };

    const handleDownload = (format) => {
        if (!qrCodeImage) return;
        const a = document.createElement('a');
        a.href = qrCodeImage;
        a.download = `qr-code.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleLogoChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setLogoFile(file);
            handleCustomizationChange('error_correction', 'Q');
        }
    };

    const removeLogo = () => {
        setLogoFile(null);
        handleCustomizationChange('error_correction', 'M');
    }


    const renderContentForm = () => {
        switch (qrConfig.qr_type) {
            case 'url':
                return <TextField fullWidth label="URL" name="url" value={qrConfig.content.url || ''} onChange={handleContentChange} />;
            case 'text':
                return <TextField fullWidth multiline rows={4} label="Text" name="text" value={qrConfig.content.text || ''} onChange={handleContentChange} />;
            case 'wifi':
                return (
                    <>
                        <TextField fullWidth label="Network Name (SSID)" name="ssid" value={qrConfig.content.ssid || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Password" name="password" type="password" value={qrConfig.content.password || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>Security</InputLabel>
                            <Select name="security" value={qrConfig.content.security || 'WPA'} onChange={handleContentChange}>
                                <MenuItem value="WPA">WPA/WPA2</MenuItem>
                                <MenuItem value="WEP">WEP</MenuItem>
                                <MenuItem value="None">None</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel control={<Checkbox name="hidden" checked={qrConfig.content.hidden || false} onChange={handleContentChange} />} label="Hidden Network" />
                    </>
                );
            case 'email':
                return (
                    <>
                        <TextField fullWidth label="To" name="email" value={qrConfig.content.email || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Subject" name="subject" value={qrConfig.content.subject || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth multiline rows={4} label="Body" name="body" value={qrConfig.content.body || ''} onChange={handleContentChange} />
                    </>
                );
            case 'contact':
                return (
                    <>
                        <TextField fullWidth label="First Name" name="first_name" value={qrConfig.content.first_name || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Last Name" name="last_name" value={qrConfig.content.last_name || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Phone Number" name="phone" value={qrConfig.content.phone || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Email" name="email" value={qrConfig.content.email || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Company" name="company" value={qrConfig.content.company || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Job Title" name="job_title" value={qrConfig.content.job_title || ''} onChange={handleContentChange} sx={{ mb: 2 }} />
                        <TextField fullWidth label="Website" name="website" value={qrConfig.content.website || ''} onChange={handleContentChange} />
                    </>
                );
            default:
                return null;
        }
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2 }}>
                    <Typography variant="h6" gutterBottom>Input</Typography>
                    <Tabs value={qrConfig.qr_type} onChange={handleTabChange} variant="fullWidth" sx={{ mb: 2 }}>
                        <Tab label="URL" value="url" />
                        <Tab label="Text" value="text" />
                        <Tab label="WiFi" value="wifi" />
                        <Tab label="Email" value="email" />
                        <Tab label="Contact" value="contact" />
                    </Tabs>
                    <Box sx={{ p: 2 }}>
                        {renderContentForm()}
                    </Box>
                </Paper>
                <Paper sx={{ p: 2, mt: 2 }}>
                    <Typography variant="h6" gutterBottom>Customization</Typography>
                    <Box sx={{ p: 2 }}>
                        <Typography gutterBottom>Size (px)</Typography>
                        <Slider
                            value={qrConfig.customization.size}
                            onChange={(e, val) => handleCustomizationChange('size', val)}
                            min={200}
                            max={2000}
                            step={10}
                            valueLabelDisplay="auto"
                        />
                        <Typography gutterBottom>Foreground Color</Typography>
                        <input type="color" value={qrConfig.customization.foreground_color} onChange={(e) => handleCustomizationChange('foreground_color', e.target.value)} style={{ width: '100%', height: '40px' }} />
                        <Typography gutterBottom sx={{ mt: 2 }}>Background Color</Typography>
                        <input type="color" value={qrConfig.customization.background_color} onChange={(e) => handleCustomizationChange('background_color', e.target.value)} style={{ width: '100%', height: '40px' }} />
                        <Button variant="contained" component="label" fullWidth sx={{ mt: 2 }}>
                            Upload Logo
                            <input type="file" hidden accept="image/png, image/jpeg" onChange={handleLogoChange} />
                        </Button>
                        {logoFile && (
                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <Typography variant="body2" sx={{ mr: 1 }}>{logoFile.name}</Typography>
                                <Button size="small" onClick={removeLogo}>Remove</Button>
                            </Box>
                        )}
                        <FormControl fullWidth sx={{ mt: 2 }}>
                            <InputLabel>Error Correction</InputLabel>
                            <Select
                                name="error_correction"
                                value={qrConfig.customization.error_correction}
                                onChange={(e) => handleCustomizationChange('error_correction', e.target.value)}
                                disabled={!!logoFile}
                            >
                                <MenuItem value="L">Low (L) - Recovers up to 7% of data</MenuItem>
                                <MenuItem value="M">Medium (M) - Recovers up to 15% of data</MenuItem>
                                <MenuItem value="Q">Quartile (Q) - Recovers up to 25% of data</MenuItem>
                                <MenuItem value="H">High (H) - Recovers up to 30% of data</MenuItem>
                            </Select>
                            {logoFile && <Typography variant="caption" sx={{mt: 1}}>Error correction is automatically set to High when a logo is used.</Typography>}
                        </FormControl>
                    </Box>
                </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
                <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>Live Preview</Typography>
                    <Box sx={{ my: 2, p:1, border: '1px dashed grey', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {loading && <Typography>Generating...</Typography>}
                        {error && <Typography color="error">{error}</Typography>}
                        {qrCodeImage && !loading && !error && <img src={qrCodeImage} alt="Generated QR Code" style={{ maxWidth: '100%', height: 'auto' }} />}
                    </Box>
                    <Box>
                        <Button variant="contained" onClick={() => handleDownload('png')} sx={{ mr: 1 }}>Download PNG</Button>
                        <Button variant="outlined" onClick={() => handleDownload('svg')}>Download SVG</Button>
                    </Box>
                </Paper>
            </Grid>
        </Grid>
    );
};

export default QrCodeGenerator;
