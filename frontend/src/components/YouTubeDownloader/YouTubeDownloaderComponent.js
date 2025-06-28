import React, { useState } from 'react';
import { Box, TextField, Button, Typography, CircularProgress, Card, CardContent, CardMedia, LinearProgress, Container, Paper } from '@mui/material';
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

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            getInfo();
        }
    };

    return (
        <Container maxWidth="md" sx={{ py: 2 }}>
            <Paper elevation={3} sx={{ p: 3, backgroundColor: 'background.paper' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" gutterBottom>
                        Download {format.toUpperCase()}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Enter a YouTube video URL to download as {format.toUpperCase()}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Enter YouTube URL"
                        variant="outlined"
                        value={url}
                        onChange={handleUrlChange}
                        onKeyDown={handleKeyPress}
                        disabled={loading || downloading}
                        placeholder="https://www.youtube.com/watch?v=..."
                    />
                    <Button
                        variant="contained"
                        onClick={getInfo}
                        disabled={loading || downloading}
                        sx={{ minWidth: 100, whiteSpace: 'nowrap' }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Fetch'}
                    </Button>
                </Box>

                {(loading) && (
                    <Box sx={{ width: '100%', my: 2 }}>
                        <Typography variant="body2" align="center" sx={{ mb: 1 }}>{statusMessage}</Typography>
                        <LinearProgress />
                    </Box>
                )}

                {error && <Typography color="error" align="center" sx={{ mt: 2 }}>{error}</Typography>}
            </Paper>

            {videoInfo && !loading && (
                <Paper elevation={3} sx={{ mt: 3, backgroundColor: 'background.paper' }}>
                    <CardMedia
                        component="img"
                        sx={{ objectFit: 'contain', maxHeight: 300 }}
                        image={videoInfo.thumbnail}
                        alt={videoInfo.title}
                    />
                    <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                            {videoInfo.title}
                        </Typography>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleDownload}
                            fullWidth
                            disabled={downloading}
                            sx={{ mt: 2 }}
                        >
                            {downloading ? <CircularProgress size={24} /> : `Download ${format.toUpperCase()}`}
                        </Button>
                        {downloading && statusMessage && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 1 }}>
                                {statusMessage}
                            </Typography>
                        )}
                    </CardContent>
                </Paper>
            )}
        </Container>
    );
};

export default YouTubeDownloaderComponent;
