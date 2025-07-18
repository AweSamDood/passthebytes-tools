// src/components/PngToPdf/FileUpload.js
import React from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

function FileUpload({ onDrop, accept, multiple = true, caption }) {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        multiple,
        maxSize: 50 * 1024 * 1024, // 50MB
    });

    return (
        <Box
            {...getRootProps()}
            sx={{
                border: '2px dashed',
                borderColor: isDragActive ? 'primary.main' : 'grey.400',
                borderRadius: 2,
                p: 4,
                textAlign: 'center',
                cursor: 'pointer',
                backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'action.hover'
                }
            }}
        >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />

            {isDragActive ? (
                <Typography variant="h6" color="primary">
                    Drop the images here...
                </Typography>
            ) : (
                <>
                    <Typography variant="h6" gutterBottom>
                        Drag & drop images here
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Or click to browse files
                    </Typography>
                    <Button variant="outlined" component="span">
                        Choose Files
                    </Button>
                </>
            )}

            <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                {caption || 'No file restrictions.'}
            </Typography>
        </Box>
    );
}

export default FileUpload;