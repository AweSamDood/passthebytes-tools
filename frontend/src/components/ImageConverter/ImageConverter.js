import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    Typography,
    Paper,
    Grid,
    Link,
    List,
    ListItem,
    ListItemAvatar,
    Avatar,
    ListItemText,
    IconButton
} from '@mui/material';
import { Delete } from '@mui/icons-material';
import FileUpload from '../PngToPdf/FileUpload';
import { convertImage } from '../../utils/api';

const outputFormats = [
    { value: 'png', label: 'PNG' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'webp', label: 'WebP' },
    { value: 'ico', label: 'ICO (Favicon)' },
    { value: 'avif', label: 'AVIF' },
];

function ImageConverter() {
    const [images, setImages] = useState([]);
    const [outputFormat, setOutputFormat] = useState('png');
    const [convertedFile, setConvertedFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileDrop = useCallback((acceptedFiles) => {
        const validFiles = acceptedFiles.filter(file => file.type.startsWith('image/'));
        if (validFiles.length !== acceptedFiles.length) {
            setError('Some files were not valid images and were ignored.');
        } else {
            setError(null);
        }
        setImages(prev => [...prev, ...validFiles]);
        setConvertedFile(null);
    }, []);

    const handleRemoveImage = (index) => {
        setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleConvert = async () => {
        if (images.length === 0) {
            setError('Please upload at least one image.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setConvertedFile(null);

        try {
            const response = await convertImage(images, outputFormat);
            const disposition = response.headers.get('content-disposition');
            let filename;

            if (disposition) {
                const filenameMatch = /filename=([^;]+)/.exec(disposition);
                if (filenameMatch && filenameMatch[1]) {
                    // Use filename from header, removing potential quotes
                    filename = filenameMatch[1].replace(/['"]/g, '');
                }
            }

            if (!filename) {
                // Fallback if header is missing or doesn't contain filename
                if (images.length > 1) {
                    filename = 'images.zip';
                } else {
                    const originalName = images[0].name;
                    const baseName = originalName.includes('.') ? originalName.substring(0, originalName.lastIndexOf('.')) : originalName;
                    filename = `${baseName}.${outputFormat}`;
                }
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setConvertedFile({ url, filename });
        } catch (err) {
            setError('An error occurred during conversion. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleReset = () => {
        setImages([]);
        setConvertedFile(null);
        setError(null);
    };

    return (
        <Container maxWidth="md">
            <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                Image Format Converter
            </Typography>

            <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <FileUpload
                            onDrop={handleFileDrop}
                            accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.avif'] }}
                            multiple={true}
                            caption="Supported formats: PNG, JPG, WebP, GIF, BMP, AVIF (max 50MB)"
                        />
                    </Grid>

                    {images.length > 0 && (
                        <Grid item xs={12}>
                            <Typography variant="h6">Selected Images:</Typography>
                            <List>
                                {images.map((file, index) => (
                                    <ListItem
                                        key={index}
                                        secondaryAction={
                                            <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveImage(index)}>
                                                <Delete />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemAvatar>
                                            <Avatar src={URL.createObjectURL(file)} />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={file.name}
                                            secondary={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                                        />
                                    </ListItem>
                                ))}
                            </List>
                            <Button variant="outlined" onClick={handleReset} sx={{ mt: 2 }}>
                                Clear All Images
                            </Button>
                        </Grid>
                    )}

                    {images.length > 0 && (
                        <>
                            <Grid item xs={12} md={6}>
                                <FormControl fullWidth>
                                    <InputLabel id="output-format-label">Output Format</InputLabel>
                                    <Select
                                        labelId="output-format-label"
                                        value={outputFormat}
                                        label="Output Format"
                                        onChange={(e) => setOutputFormat(e.target.value)}
                                    >
                                        {outputFormats.map((format) => (
                                            <MenuItem key={format.value} value={format.value}>
                                                {format.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={handleConvert}
                                    disabled={isLoading}
                                    fullWidth
                                    sx={{ height: '100%' }}
                                >
                                    {isLoading ? 'Converting...' : `Convert ${images.length} Image(s)`}
                                </Button>
                            </Grid>
                        </>
                    )}
                </Grid>
            </Paper>

            {error && (
                <Typography color="error" align="center" sx={{ mb: 2 }}>
                    {error}
                </Typography>
            )}

            {convertedFile && (
                <Box textAlign="center">
                    <Typography variant="h6" gutterBottom>
                        Conversion Successful!
                    </Typography>
                    <Button
                        variant="contained"
                        color="success"
                        href={convertedFile.url}
                        download={convertedFile.filename}
                        component={Link}
                    >
                        Download {convertedFile.filename.endsWith('.zip') ? 'ZIP' : 'File'}
                    </Button>
                </Box>
            )}
        </Container>
    );
}

export default ImageConverter;
