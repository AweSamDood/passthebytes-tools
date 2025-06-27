// src/components/ToolsGrid.js
import React from 'react';
import {
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    Chip
} from '@mui/material';
import { PictureAsPdf, Update, VpnKey, DocumentScanner, YouTube, CompareArrows, QrCode } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const tools = [
    {
        id: 'png-to-pdf',
        title: 'Images to PDF Converter',
        description: 'Convert multiple PNG/JPG images to a single PDF with custom ordering and DPI settings. \n The output pdf has selectable text.',
        icon: PictureAsPdf,
        path: '/png-to-pdf',
        status: 'available',
        features: ['Custom Order', 'Custom DPI Quality']
    },
    {
        id: 'image-optimizer',
        title: 'Image Optimizer',
        description: 'Compress and optimize images while maintaining quality.',
        icon: Update,
        path: '/image-optimizer',
        status: 'coming-soon',
        features: ['Size Reduction', 'Quality Control', 'Multiple Formats']
    },
    {
        id: 'image-converter',
        title: 'Image Format Converter',
        description: 'Convert between common image formats.',
        icon: Update,
        path: '/image-converter',
        status: 'available',
        features: ['PNG', 'JPG', 'WebP', 'ICO', 'GIF','AVIF']
    },
    {
        id: 'password-generator',
        title: 'Password Generator',
        description: 'Create strong, random passwords with customizable rules.',
        icon: VpnKey,
        path: '/password-generator',
        status: 'available',
        features: ['Custom Length', 'Character Types', 'Secure']
    },
    {
        id: 'text-from-image',
        title: 'Text from Image (OCR)',
        description: 'Extract text from images using Optical Character Recognition.',
        icon: DocumentScanner,
        path: '/text-from-image',
        status: 'coming-soon',
        features: ['Supports Various Formats', 'High Accuracy', 'Copy to Clipboard']
    },
    {
        id: 'youtube-downloader',
        title: 'YouTube Downloader',
        description: 'Download YouTube videos as MP3 or MP4 files.',
        icon: YouTube,
        path: '/youtube-downloader',
        status: 'coming-soon',
        features: ['MP3 Audio', 'MP4 Video', 'Multiple Resolutions']
    },
    {
        id: 'diff-checker',
        title: 'Diff Checker',
        description: 'Compare two text files to find the differences.',
        icon: CompareArrows,
        path: '/diff-checker',
        status: 'coming-soon',
        features: ['Side-by-Side View', 'Inline View', 'Syntax Highlighting']
    },
    {
        id: 'qr-code-generator',
        title: 'QR Code Generator',
        description: 'Create QR codes for URLs, text, and more.',
        icon: QrCode,
        path: '/qr-code-generator',
        status: 'available',
        features: ['Custom Colors', 'Logo Upload', 'Multiple Formats']
    }
];

function ToolsGrid() {
    const navigate = useNavigate();

    return (
        <Box>
            <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                Available Tools
            </Typography>

            <Grid container spacing={3}>
                {tools.map((tool) => {
                    const IconComponent = tool.icon;

                    return (
                        <Grid item xs={12} md={6} lg={4} key={tool.id}>
                            <Card
                                sx={{
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: tool.status === 'available' ? 'translateY(-4px)' : 'none',
                                        boxShadow: tool.status === 'available' ? 3 : 1,
                                    }
                                }}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                        <IconComponent
                                            sx={{
                                                fontSize: 40,
                                                mr: 2,
                                                color: tool.status === 'available' ? 'primary.main' : 'grey.400'
                                            }}
                                        />
                                        <Box>
                                            <Typography variant="h6" gutterBottom>
                                                {tool.title}
                                            </Typography>
                                            <Chip
                                                label={tool.status === 'available' ? 'Available' : 'Coming Soon'}
                                                color={tool.status === 'available' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </Box>
                                    </Box>

                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        {tool.description}
                                    </Typography>

                                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                        {tool.features.map((feature) => (
                                            <Chip
                                                key={feature}
                                                label={feature}
                                                variant="outlined"
                                                size="small"
                                                sx={{ fontSize: '0.7rem' }}
                                            />
                                        ))}
                                    </Box>
                                </CardContent>

                                <CardActions>
                                    <Button
                                        variant={tool.status === 'available' ? 'contained' : 'outlined'}
                                        fullWidth
                                        disabled={tool.status !== 'available'}
                                        onClick={() => tool.status === 'available' && navigate(tool.path)}
                                    >
                                        {tool.status === 'available' ? 'Open Tool' : 'Coming Soon'}
                                    </Button>
                                </CardActions>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>
        </Box>
    );
}

export default ToolsGrid;