
// src/components/PngToPdf/FileUpload.js
import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, Button } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

function FileUpload({ onFilesAdded }) {
    const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
        if (rejectedFiles.length > 0) {
            console.warn('Some files were rejected:', rejectedFiles);
        }

        if (acceptedFiles.length > 0) {
            onFilesAdded(acceptedFiles);
        }
    }, [onFilesAdded]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/png': ['.png'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/jpg': ['.jpg']
        },
        multiple: true,
        maxSize: 50 * 1024 * 1024 // 50MB
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
                Supported formats: PNG, JPG, JPEG (max 50MB each)
            </Typography>
        </Box>
    );
}

export default FileUpload;