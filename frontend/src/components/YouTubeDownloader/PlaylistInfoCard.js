import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Divider,
    Chip
} from '@mui/material';
import { PlaylistPlay, GetApp } from '@mui/icons-material';

const PlaylistInfoCard = ({ playlistInfo, onSelectionChange, loading }) => {
    if (!playlistInfo) return null;

    return (
        <Paper
            elevation={3}
            sx={{
                p: 3,
                mt: 3,
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider'
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <PlaylistPlay color="primary" />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Playlist Information
                </Typography>
                <Chip
                    label={`${playlistInfo.videos.length} videos`}
                    color="primary"
                    variant="outlined"
                />
            </Box>

            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
                {playlistInfo.title}
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Channel: {playlistInfo.uploader}
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Typography variant="body2" color="text.secondary">
                Select the range of videos you want to download. The playlist will be downloaded as a ZIP file containing all selected MP3 files.
            </Typography>
        </Paper>
    );
};

export default PlaylistInfoCard;
