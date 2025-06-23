// src/components/PngToPdf/PngToPdfConverter.js
import React, { useState, useCallback } from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    TextField,
    Slider,
    Alert,
    CircularProgress,
    Chip
} from '@mui/material';
import { CloudUpload, Download, Clear, Reorder } from '@mui/icons-material';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

import FileUpload from './FileUpload';
import ImagePreview from './ImagePreview';
import { convertToPdf } from '../../utils/api';

function PngToPdfConverter() {
    const [files, setFiles] = useState([]);
    const [isConverting, setIsConverting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [settings, setSettings] = useState({
        dpi: 300,
        filename: 'converted_document'
    });

    // Handle file upload
    const handleFilesAdded = useCallback((newFiles) => {
        setError('');
        setSuccess('');

        // Add unique IDs to files for drag and drop
        const filesWithIds = newFiles.map((file, index) => ({
            file,
            id: `file-${Date.now()}-${index}`,
            preview: URL.createObjectURL(file)
        }));

        setFiles(prev => [...prev, ...filesWithIds]);
    }, []);

    // Handle drag end for reordering
    const handleDragEnd = useCallback((result) => {
        if (!result.destination) return;

        const items = Array.from(files);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setFiles(items);
    }, [files]);

    // Remove file
    const removeFile = useCallback((fileId) => {
        setFiles(prev => {
            const updated = prev.filter(f => f.id !== fileId);
            // Clean up preview URLs
            const removed = prev.find(f => f.id === fileId);
            if (removed?.preview) {
                URL.revokeObjectURL(removed.preview);
            }
            return updated;
        });
    }, []);

    // Clear all files
    const clearAll = useCallback(() => {
        files.forEach(f => {
            if (f.preview) {
                URL.revokeObjectURL(f.preview);
            }
        });
        setFiles([]);
        setError('');
        setSuccess('');
    }, [files]);

    // Convert to PDF
    const handleConvert = async () => {
        if (files.length === 0) {
            setError('Please select at least one image file');
            return;
        }

        setIsConverting(true);
        setError('');
        setSuccess('');

        try {
            // Prepare form data with files in correct order
            const formData = new FormData();
            files.forEach(fileObj => {
                formData.append('files', fileObj.file);
            });
            formData.append('dpi', settings.dpi.toString());
            formData.append('filename', settings.filename);

            const blob = await convertToPdf(formData);

            // Download the PDF
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${settings.filename}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            setSuccess(`Successfully converted ${files.length} images to PDF!`);
        } catch (err) {
            setError(err.message || 'Conversion failed. Please try again.');
        } finally {
            setIsConverting(false);
        }
    };

    const dpiMarks = [
        { value: 72, label: '72 DPI (Web)' },
        { value: 150, label: '150 DPI' },
        { value: 300, label: '300 DPI (Print)' },
        { value: 600, label: '600 DPI (High)' }
    ];

    return (
        <Box>
            {/* Header */}
            <Box sx={{ mb: 4, textAlign: 'center' }}>
                <Typography variant="h4" gutterBottom>
                    PNG to PDF Converter
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Convert multiple images to a single PDF with custom ordering and quality settings
                </Typography>
            </Box>

            {/* File Upload Section */}
            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    1. Select Images
                </Typography>
                <FileUpload
                    onDrop={handleFilesAdded}
                    accept={{ 'image/png': ['.png'], 'image/jpeg': ['.jpg', '.jpeg'] }}
                    caption="Supported formats: PNG, JPG, JPEG (max 50MB each)"
                    multiple={true}
                />

                {files.length > 0 && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                            icon={<CloudUpload />}
                            label={`${files.length} file(s) selected`}
                            color="primary"
                        />
                        <Button
                            startIcon={<Clear />}
                            onClick={clearAll}
                            variant="outlined"
                            size="small"
                        >
                            Clear All
                        </Button>
                    </Box>
                )}
            </Paper>

            {/* Image Preview and Reordering */}
            {files.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Typography variant="h6" sx={{ flexGrow: 1 }}>
                            2. Arrange Page Order
                        </Typography>
                        <Chip
                            icon={<Reorder />}
                            label="Drag to reorder"
                            variant="outlined"
                            size="small"
                        />
                    </Box>

                    <DragDropContext onDragEnd={handleDragEnd}>
                        <Droppable droppableId="images" direction="horizontal">
                            {(provided) => (
                                <Box
                                    {...provided.droppableProps}
                                    ref={provided.innerRef}
                                    sx={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: 2,
                                        minHeight: 120
                                    }}
                                >
                                    {files.map((fileObj, index) => (
                                        <Draggable key={fileObj.id} draggableId={fileObj.id} index={index}>
                                            {(provided, snapshot) => (
                                                <Box
                                                    ref={provided.innerRef}
                                                    {...provided.draggableProps}
                                                    {...provided.dragHandleProps}
                                                    sx={{
                                                        transform: snapshot.isDragging ? 'rotate(5deg)' : 'none',
                                                        zIndex: snapshot.isDragging ? 1000 : 1
                                                    }}
                                                >
                                                    <ImagePreview
                                                        fileObj={fileObj}
                                                        index={index}
                                                        onRemove={removeFile}
                                                        isDragging={snapshot.isDragging}
                                                    />
                                                </Box>
                                            )}
                                        </Draggable>
                                    ))}
                                    {provided.placeholder}
                                </Box>
                            )}
                        </Droppable>
                    </DragDropContext>
                </Paper>
            )}

            {/* Settings */}
            {files.length > 0 && (
                <Paper sx={{ p: 3, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        3. Conversion Settings
                    </Typography>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Filename */}
                        <TextField
                            label="Output Filename"
                            value={settings.filename}
                            onChange={(e) => setSettings(prev => ({ ...prev, filename: e.target.value }))}
                            fullWidth
                            helperText="PDF extension will be added automatically"
                        />

                        {/* DPI Slider */}
                        <Box>
                            <Typography gutterBottom>
                                Quality (DPI): {settings.dpi}
                            </Typography>
                            <Slider
                                value={settings.dpi}
                                onChange={(e, value) => setSettings(prev => ({ ...prev, dpi: value }))}
                                min={72}
                                max={600}
                                marks={dpiMarks}
                                step={25}
                                valueLabelDisplay="auto"
                            />
                            <Typography variant="body2" color="text.secondary">
                                Higher DPI = better quality but larger file size
                            </Typography>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Convert Button */}
            {files.length > 0 && (
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={isConverting ? <CircularProgress size={20} /> : <Download />}
                        onClick={handleConvert}
                        disabled={isConverting}
                        sx={{ minWidth: 200 }}
                    >
                        {isConverting ? 'Converting...' : 'Convert to PDF'}
                    </Button>
                </Paper>
            )}

            {/* Messages */}
            {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                </Alert>
            )}

            {success && (
                <Alert severity="success" sx={{ mt: 2 }}>
                    {success}
                </Alert>
            )}
        </Box>
    );
}

export default PngToPdfConverter;