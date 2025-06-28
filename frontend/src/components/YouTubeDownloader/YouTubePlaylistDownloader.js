import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, Button, Typography, List, ListItem, ListItemText, Checkbox, CircularProgress, Alert, Slider, LinearProgress } from '@mui/material';
import { getYouTubePlaylistInfo, startYouTubePlaylistDownload, getYouTubePlaylistProgress } from '../../utils/api';
import { API_BASE_URL } from '../../config';

const YouTubePlaylistDownloader = () => {
    const [playlistUrl, setPlaylistUrl] = useState('');
    const [playlistInfo, setPlaylistInfo] = useState(null);
    const [selectedVideos, setSelectedVideos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [downloading, setDownloading] = useState(false);
    const [range, setRange] = useState([1, 10]);
    const [progress, setProgress] = useState(0);
    const [totalFiles, setTotalFiles] = useState(0);
    const [status, setStatus] = useState('');
    const [jobId, setJobId] = useState(null);
    const [zipPath, setZipPath] = useState(null);
    const pollingIntervalRef = useRef(null);
    const pollRetries = useRef(0);

    useEffect(() => {
        if (jobId) {
            pollRetries.current = 0;
            pollingIntervalRef.current = setInterval(async () => {
                try {
                    const progressData = await getYouTubePlaylistProgress(jobId);
                    pollRetries.current = 0; // Reset retries on successful fetch

                    if (progressData.status === 'complete') {
                        setStatus('Ready to download');
                        setDownloading(false);
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                        setJobId(null);
                        setZipPath(progressData.zip_name);
                        setProgress(progressData.total || totalFiles);
                    } else if (progressData.status === 'error') {
                        console.error("Download error from backend:", progressData.message);
                        setError(progressData.message || 'An error occurred during download.');
                        setDownloading(false);
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                        setJobId(null);
                    } else {
                        setStatus(progressData.status);
                        setProgress(progressData.current || 0);
                        setTotalFiles(progressData.total || 0);
                    }
                } catch (error) {
                    pollRetries.current += 1;
                    if (pollRetries.current > 5) {
                        setError('Failed to get download progress. Please try again.');
                        setDownloading(false);
                        clearInterval(pollingIntervalRef.current);
                        pollingIntervalRef.current = null;
                        setJobId(null);
                    }
                }
            }, 2000); // Poll every 2 seconds
        }

        return () => {
            if (pollingIntervalRef.current) {
                clearInterval(pollingIntervalRef.current);
            }
        };
    }, [jobId, totalFiles]);

    const handleFetchPlaylistInfo = async () => {
        if (!playlistUrl) {
            setError('Please enter a playlist URL.');
            return;
        }
        setLoading(true);
        setError('');
        setPlaylistInfo(null);
        setSelectedVideos([]);
        try {
            const data = await getYouTubePlaylistInfo(playlistUrl);
            setPlaylistInfo(data);
            setRange([1, Math.min(data.videos.length, 10)]);
            setSelectedVideos(data.videos.slice(0, Math.min(data.videos.length, 10)).map(v => v.id));
        } catch (error) {
            console.error("Failed to fetch playlist info:", error);
            setError(error.message || 'Failed to fetch playlist info.');
        }
        setLoading(false);
    };

    const handlePreparePlaylist = async () => {
        if (selectedVideos.length === 0) {
            setError('Please select at least one video to download.');
            return;
        }
        setDownloading(true);
        setError('');
        setProgress(0);
        setTotalFiles(selectedVideos.length);
        setStatus('Initializing...');
        setZipPath(null);
        setJobId(null);

        try {
            const data = await startYouTubePlaylistDownload(playlistUrl, selectedVideos);
            setJobId(data.job_id);
        } catch (error) {
            console.error("Failed to start playlist download:", error);
            setError(error.message || 'Failed to start preparation.');
            setDownloading(false);
        }
    };

    const handleDownloadZip = async () => {
        if (zipPath) {
            const downloadUrl = `${API_BASE_URL}/api/youtube/download-zip/?filename=${encodeURIComponent(zipPath)}`;
            window.location.href = downloadUrl;
        }
    };

    const handleSelectVideo = (videoId) => {
        setSelectedVideos(prev =>
            prev.includes(videoId) ? prev.filter(id => id !== videoId) : [...prev, videoId]
        );
    };

    const handleRangeChange = (event, newValue) => {
        setRange(newValue);
        if (playlistInfo) {
            setSelectedVideos(playlistInfo.videos.slice(newValue[0] - 1, newValue[1]).map(v => v.id));
        }
    };

    const handleSelectAll = () => {
        if (playlistInfo) {
            if (selectedVideos.length === (range[1] - range[0] + 1)) {
                setSelectedVideos([]);
            } else {
                setSelectedVideos(playlistInfo.videos.slice(range[0] - 1, range[1]).map(v => v.id));
            }
        }
    };

    return (
        <Box>
            <TextField
                fullWidth
                label="YouTube Playlist URL"
                variant="outlined"
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                sx={{ mb: 2 }}
            />
            <Button variant="contained" onClick={handleFetchPlaylistInfo} disabled={loading}>
                {loading ? <CircularProgress size={24} /> : 'Fetch Playlist Info'}
            </Button>

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

            {playlistInfo && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6">{playlistInfo.title}</Typography>
                    <Typography variant="body2" color="text.secondary">{playlistInfo.videos.length} videos found.</Typography>
                    <Alert severity="warning" sx={{ my: 2 }}>Note: You can only download up to 50 videos at a time.</Alert>

                    <Box sx={{ width: '90%', mt: 2, mb: 2, mx: 'auto' }}>
                        <Typography gutterBottom>Select Range to Download</Typography>
                        <Slider
                            value={range}
                            onChange={handleRangeChange}
                            valueLabelDisplay="auto"
                            min={1}
                            max={playlistInfo.videos.length}
                            marks
                        />
                        <Typography variant="caption" color="text.secondary">
                            Note: Moving the slider will select songs in the new range and unselect any manually selected songs.
                        </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Button onClick={handleSelectAll}>
                            {selectedVideos.length === (range[1] - range[0] + 1) ? 'Deselect All' : 'Select All in Range'}
                        </Button>
                        <Typography variant="body2">
                            Selected: {selectedVideos.length} / 50 for download
                        </Typography>
                    </Box>

                    <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid #ddd', borderRadius: 1 }}>
                        {playlistInfo.videos.map((video, index) => (
                            <ListItem key={video.id} dense button onClick={() => handleSelectVideo(video.id)}>
                                <Checkbox
                                    edge="start"
                                    checked={selectedVideos.includes(video.id)}
                                    tabIndex={-1}
                                    disableRipple
                                />
                                <ListItemText primary={`${index + 1}. ${video.title}`} />
                            </ListItem>
                        ))}
                    </List>
                    <Button
                        variant="contained"
                        color="primary"
                        onClick={handlePreparePlaylist}
                        disabled={downloading || selectedVideos.length === 0}
                        sx={{ mt: 2, mr: 1 }}
                    >
                        {downloading ? <CircularProgress size={24} /> : `Prepare ${selectedVideos.length} MP3s`}
                    </Button>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={handleDownloadZip}
                        disabled={!zipPath || downloading}
                        sx={{ mt: 2 }}
                    >
                        Download ZIP
                    </Button>
                    {(downloading || zipPath) && (
                        <Box sx={{ width: '100%', mt: 2 }}>
                            <Typography variant="body2">{`${status.charAt(0).toUpperCase() + status.slice(1)}: ${progress} / ${totalFiles}`}</Typography>
                            <LinearProgress variant="determinate" value={totalFiles > 0 ? (progress / totalFiles) * 100 : 0} />
                        </Box>
                    )}
                    {zipPath && !downloading && (
                        <Alert severity="success" sx={{ mt: 2 }}>Playlist is ready for download.</Alert>
                    )}
                </Box>
            )}
        </Box>
    );
};

export default YouTubePlaylistDownloader;
