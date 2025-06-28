import React from 'react';
import {
    Box,
    Typography,
    LinearProgress,
    Paper,
    Chip,
    Alert
} from '@mui/material';
import { CloudDownload, CheckCircle, Error } from '@mui/icons-material';

const PlaylistProgressCard = ({
    downloading,
    progress,
    totalFiles,
    status,
    error,
    zipPath,
    onDownloadZip
}) => {
    if (!downloading && !zipPath && !error) return null;

    const getStatusColor = () => {
        if (error) return 'error';
        if (zipPath) return 'success';
        return 'primary';
    };

    const getStatusIcon = () => {
        if (error) return <Error />;
        if (zipPath) return <CheckCircle />;
        return <CloudDownload />;
    };

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
                {getStatusIcon()}
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                    Download Progress
                </Typography>
                <Chip
                    label={zipPath ? 'Complete' : downloading ? 'Processing' : 'Ready'}
                    color={getStatusColor()}
                    variant={zipPath ? 'filled' : 'outlined'}
                />
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {downloading && (
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                            {status}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {progress} / {totalFiles}
                        </Typography>
                    </Box>
                    <LinearProgress
                        variant="determinate"
                        value={totalFiles > 0 ? (progress / totalFiles) * 100 : 0}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>
            )}

            {zipPath && !downloading && (
                <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Your playlist has been successfully processed and is ready for download.
                    </Typography>
                    <button
                        onClick={onDownloadZip}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#1565c0',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontWeight: 600,
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: '0 auto'
                        }}
                    >
                        <CloudDownload sx={{ fontSize: 20 }} />
                        Download ZIP File
                    </button>
                </Box>
            )}
        </Paper>
    );
};

export default PlaylistProgressCard;
