import React, { useState } from 'react';
import { Container, Typography, Select, MenuItem, FormControl, InputLabel, Paper, Box } from '@mui/material';
import YouTubeDownloaderComponent from './YouTubeDownloaderComponent';
import YouTubePlaylistDownloader from './YouTubePlaylistDownloader';

const YouTubeDownloader = () => {
    const [format, setFormat] = useState('mp3');

    const handleFormatChange = (event) => {
        setFormat(event.target.value);
    };

    return (
        <Container maxWidth="lg" sx={{ py: 2 }}>
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography variant="h4" gutterBottom>
                    YouTube Downloader
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Download YouTube videos as MP3 audio, MP4 video, or entire playlists
                </Typography>
            </Box>

            <Paper elevation={3} sx={{ p: 3, mb: 3, backgroundColor: 'background.paper', maxWidth: 'md', mx: 'auto' }}>
                <FormControl fullWidth>
                    <InputLabel id="format-select-label">Select Download Format</InputLabel>
                    <Select
                        labelId="format-select-label"
                        id="format-select"
                        value={format}
                        label="Select Download Format"
                        onChange={handleFormatChange}
                    >
                        <MenuItem value="mp3">MP3 Audio</MenuItem>
                        <MenuItem value="mp4">MP4 Video</MenuItem>
                        <MenuItem value="mp3-playlist">MP3 Playlist</MenuItem>
                    </Select>
                </FormControl>
            </Paper>

            {format === 'mp3' && <YouTubeDownloaderComponent format="mp3" />}
            {format === 'mp4' && <YouTubeDownloaderComponent format="mp4" />}
            {format === 'mp3-playlist' && <YouTubePlaylistDownloader />}
        </Container>
    );
};

export default YouTubeDownloader;
