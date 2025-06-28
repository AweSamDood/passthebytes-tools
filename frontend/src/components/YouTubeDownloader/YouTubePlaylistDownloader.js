import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    List,
    ListItem,
    ListItemText,
    Checkbox,
    CircularProgress,
    Alert,
    Slider,
    Paper,
    Container,
    Divider,
    Chip
} from '@mui/material';
import { PlaylistPlay, GetApp, CloudDownload } from '@mui/icons-material';
import { getYouTubePlaylistInfo, startYouTubePlaylistDownload, getYouTubePlaylistProgress } from '../../utils/api';
import { API_BASE_URL } from '../../config';
import PlaylistInfoCard from './PlaylistInfoCard';
import PlaylistProgressCard from './PlaylistProgressCard';

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
                    pollRetries.current = 0;

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
            }, 2000);
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

        try {
            const response = await startYouTubePlaylistDownload(playlistUrl, selectedVideos);
            setJobId(response.job_id);
        } catch (error) {
            console.error("Failed to start playlist download:", error);
            setError(error.message || 'Failed to start playlist download.');
            setDownloading(false);
        }
    };

    const handleDownloadZip = () => {
        if (zipPath) {
            const link = document.createElement('a');
            link.href = `${API_BASE_URL}/api/youtube-downloader/download-zip/${zipPath}`;
            link.download = zipPath;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleRangeChange = (event, newValue) => {
        setRange(newValue);
        if (playlistInfo) {
            const start = newValue[0] - 1;
            const end = newValue[1];
            setSelectedVideos(playlistInfo.videos.slice(start, end).map(v => v.id));
        }
    };

    const handleVideoToggle = (videoId) => {
        setSelectedVideos(prev =>
            prev.includes(videoId)
                ? prev.filter(id => id !== videoId)
                : [...prev, videoId]
        );
    };

    return (
        <Container maxWidth="md" sx={{ py: 2 }}>
            <Paper elevation={3} sx={{ p: 3, backgroundColor: 'background.paper' }}>
                <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                        <PlaylistPlay />
                        MP3 Playlist Downloader
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Download multiple videos from a YouTube playlist as MP3 files
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <TextField
                        fullWidth
                        label="Enter YouTube Playlist URL"
                        variant="outlined"
                        value={playlistUrl}
                        onChange={(e) => setPlaylistUrl(e.target.value)}
                        disabled={loading || downloading}
                        placeholder="https://www.youtube.com/playlist?list=..."
                    />
                    <Button
                        variant="contained"
                        onClick={handleFetchPlaylistInfo}
                        disabled={loading || downloading}
                        sx={{ minWidth: 120, whiteSpace: 'nowrap' }}
                    >
                        {loading ? <CircularProgress size={24} /> : 'Fetch Playlist'}
                    </Button>
                </Box>

                {error && !downloading && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}
            </Paper>

            <PlaylistInfoCard playlistInfo={playlistInfo} loading={loading} />

            {playlistInfo && (
                <Paper elevation={3} sx={{ p: 3, mt: 3, backgroundColor: 'background.paper' }}>
                    <Typography variant="h6" gutterBottom>
                        Select Videos to Download
                    </Typography>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body2">
                            <strong>Important:</strong> You can download up to 50 videos per request.
                            When you change the range slider, the selection will automatically update to match your chosen range.
                        </Typography>
                    </Alert>

                    <Box sx={{ mb: 3 }}>
                        <Typography gutterBottom>
                            Select Range: Videos {range[0]} to {range[1]} ({range[1] - range[0] + 1} videos will be selected)
                        </Typography>
                        <Slider
                            value={range}
                            onChange={handleRangeChange}
                            valueLabelDisplay="auto"
                            min={1}
                            max={Math.min(playlistInfo.videos.length, 50)}
                            disabled={downloading}
                        />
                        <Typography variant="caption" color="text.secondary">
                            Maximum 50 videos can be downloaded at once. Use the slider to quickly select a range, or manually check/uncheck individual videos below.
                        </Typography>
                    </Box>

                    <List sx={{ maxHeight: 400, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
                        {playlistInfo.videos.map((video, index) => (
                            <ListItem
                                key={video.id}
                                dense
                                sx={{
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    backgroundColor: selectedVideos.includes(video.id) ? 'action.selected' : 'transparent'
                                }}
                            >
                                <Checkbox
                                    edge="start"
                                    checked={selectedVideos.includes(video.id)}
                                    onChange={() => handleVideoToggle(video.id)}
                                    disabled={downloading}
                                />
                                <ListItemText
                                    primary={
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 30 }}>
                                                {index + 1}.
                                            </Typography>
                                            <Typography variant="body1">
                                                {video.title}
                                            </Typography>
                                        </Box>
                                    }
                                />
                            </ListItem>
                        ))}
                    </List>

                    <Box sx={{ mt: 3, textAlign: 'center' }}>
                        <Button
                            variant="contained"
                            onClick={handlePreparePlaylist}
                            disabled={downloading || selectedVideos.length === 0}
                            sx={{ minWidth: 200 }}
                        >
                            {downloading ? <CircularProgress size={24} /> : `Download ${selectedVideos.length} Videos`}
                        </Button>
                    </Box>
                </Paper>
            )}

            <PlaylistProgressCard
                downloading={downloading}
                progress={progress}
                totalFiles={totalFiles}
                status={status}
                error={downloading ? error : null}
                zipPath={zipPath}
                onDownloadZip={handleDownloadZip}
            />
        </Container>
    );
};

export default YouTubePlaylistDownloader;
