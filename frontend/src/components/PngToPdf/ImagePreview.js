// src/components/PngToPdf/ImagePreview.js
import React from 'react';
import {
    Card,
    CardMedia,
    IconButton,
    Box,
    Typography,
    Chip
} from '@mui/material';
import { Close, DragIndicator } from '@mui/icons-material';

function ImagePreview({ fileObj, index, onRemove, isDragging }) {
    const { file, id, preview } = fileObj;

    const formatFileSize = (bytes) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <Card
            sx={{
                width: 150,
                position: 'relative',
                transition: 'all 0.2s ease-in-out',
                transform: isDragging ? 'scale(1.05)' : 'scale(1)',
                boxShadow: isDragging ? 4 : 1,
                '&:hover': {
                    boxShadow: 3
                }
            }}
        >
            {/* Page Number */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    zIndex: 10
                }}
            >
                <Chip
                    label={`Page ${index + 1}`}
                    size="small"
                    color="primary"
                    sx={{ fontSize: '0.7rem' }}
                />
            </Box>

            {/* Remove Button */}
            <IconButton
                onClick={() => onRemove(id)}
                sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    zIndex: 10,
                    '&:hover': {
                        backgroundColor: 'rgba(255, 255, 255, 0.9)'
                    }
                }}
                size="small"
            >
                <Close fontSize="small" />
            </IconButton>

            {/* Drag Handle */}
            <Box
                sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                    borderRadius: 1,
                    p: 0.5,
                    zIndex: 10
                }}
            >
                <DragIndicator fontSize="small" />
            </Box>

            {/* Image */}
            <CardMedia
                component="img"
                height="120"
                image={preview}
                alt={file.name}
                sx={{
                    objectFit: 'cover'
                }}
            />

            {/* File Info */}
            <Box sx={{ p: 1 }}>
                <Typography
                    variant="caption"
                    display="block"
                    sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {file.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {formatFileSize(file.size)}
                </Typography>
            </Box>
        </Card>
    );
}

export default ImagePreview;