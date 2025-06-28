import React, { useState } from 'react';
import { Box, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import YouTubeDownloaderComponent from './YouTubeDownloaderComponent';
import YouTubePlaylistDownloader from './YouTubePlaylistDownloader';

const YouTubeDownloader = () => {
    const [format, setFormat] = useState('mp3');

    const handleFormatChange = (event) => {
        setFormat(event.target.value);
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, margin: 'auto' }}>
            <Typography variant="h4" gutterBottom align="center">
                YouTube Downloader
            </Typography>
            <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel id="format-select-label">Format</InputLabel>
                <Select
                    labelId="format-select-label"
                    id="format-select"
                    value={format}
                    label="Format"
                    onChange={handleFormatChange}
                >
                    <MenuItem value="mp3">MP3 Audio</MenuItem>
                    <MenuItem value="mp4">MP4 Video</MenuItem>
                    <MenuItem value="mp3-playlist">MP3 Playlist</MenuItem>
                </Select>
            </FormControl>
            {format === 'mp3' && <YouTubeDownloaderComponent format="mp3" />}
            {format === 'mp4' && <YouTubeDownloaderComponent format="mp4" />}
            {format === 'mp3-playlist' && <YouTubePlaylistDownloader />}
        </Box>
    );
};

export default YouTubeDownloader;
