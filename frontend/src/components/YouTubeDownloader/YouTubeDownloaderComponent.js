import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Card, CardContent, CardMedia, LinearProgress } from '@mui/material';
import { getYouTubeInfo, downloadYouTubeFile } from '../../utils/api';

const YouTubeDownloaderComponent = ({ format }) => {
    const [url, setUrl] = useState('');
    const [videoInfo, setVideoInfo] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);
    const [statusMessage, setStatusMessage] = useState('');

    const handleUrlChange = (e) => {
        setUrl(e.target.value);
    };

    const getInfo = async () => {
        if (!url) {
            setError('Please enter a YouTube URL.');
            return;
        }
        setError('');
        setLoading(true);
        setVideoInfo(null);
        setStatusMessage('Fetching video information...');
        try {
            const data = await getYouTubeInfo(url);
            setVideoInfo(data);
        } catch (err) {
            setError(err.message || 'Error fetching video information. Please check the URL and try again.');
            setVideoInfo(null);
        } finally {
            setLoading(false);
            setStatusMessage('');
        }
    };

    const handleDownload = async () => {
        setDownloading(true);
        setError('');
        setStatusMessage(`Downloading and converting to ${format.toUpperCase()}... This may take a moment.`);
        try {
            const { blob, filename } = await downloadYouTubeFile(url, format);
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            setError(err.message || `Error downloading the ${format} file. Please try again.`);
        } finally {
            setDownloading(false);
            setStatusMessage('');
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom align="center">
                Download {format.toUpperCase()}
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField
                    fullWidth
                    label="Enter YouTube URL"
                    variant="outlined"
                    value={url}
                    onChange={handleUrlChange}
                    disabled={loading || downloading}
                />
                <Button variant="contained" onClick={getInfo} disabled={loading || downloading}>
                    {loading ? <CircularProgress size={24} /> : 'Get Info'}
                </Button>
            </Box>
            {(loading) && (
                <Box sx={{ width: '100%', my: 2 }}>
                    <Typography variant="body2" align="center" sx={{ mb: 1 }}>{statusMessage}</Typography>
                    <LinearProgress />
                </Box>
            )}
            {error && <Typography color="error" align="center">{error}</Typography>}
            {videoInfo && !loading && (
                <Card sx={{ mt: 3 }}>
                    <CardMedia
                        component="img"
                        sx={{ objectFit: 'contain' }}
                        image={videoInfo.thumbnail}
                        alt={videoInfo.title}
                    />
                    <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                            {videoInfo.title}
                        </Typography>
                        <Button variant="contained" color="primary" onClick={handleDownload} fullWidth disabled={downloading}>
                            {downloading ? <CircularProgress size={24} /> : `Download ${format.toUpperCase()}`}
                        </Button>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default YouTubeDownloaderComponent;
