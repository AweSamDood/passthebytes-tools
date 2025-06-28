// src/components/ToolsGrid.js
import React, { useState } from 'react';
import {
    Grid,
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Box,
    Chip,
    Container,
    Fade,
    Badge,
    Divider,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    PictureAsPdf,
    Update,
    VpnKey,
    DocumentScanner,
    YouTube,
    CompareArrows,
    QrCode,
    TextFields,
    Star,
    Timeline,
    Upcoming
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const tools = [
    {
        id: 'png-to-pdf',
        title: 'Images to PDF Converter',
        description: 'Convert multiple PNG/JPG images to a single PDF with custom ordering and DPI settings. The output PDF has selectable text.',
        icon: PictureAsPdf,
        path: '/png-to-pdf',
        status: 'available',
        features: ['Custom Order', 'Custom DPI Quality'],
        category: 'Image Processing',
        popularity: 5
    },
    {
        id: 'image-converter',
        title: 'Image Format Converter',
        description: 'Convert between common image formats with high quality preservation.',
        icon: Update,
        path: '/image-converter',
        status: 'available',
        features: ['PNG', 'JPG', 'WebP', 'ICO', 'GIF', 'AVIF'],
        category: 'Image Processing',
        popularity: 4
    },
    {
        id: 'youtube-downloader',
        title: 'YouTube Downloader',
        description: 'Download YouTube videos as MP3 or MP4 files. Supports playlists and individual videos.',
        icon: YouTube,
        path: '/youtube-downloader',
        status: 'available',
        features: ['MP3 Audio', 'MP4 Video', 'MP3-Playlist'],
        category: 'Media',
        popularity: 5
    },
    {
        id: 'qr-code-generator',
        title: 'QR Code Generator',
        description: 'Create QR codes for URLs, text, and more with custom styling options.',
        icon: QrCode,
        path: '/qr-code-generator',
        status: 'available',
        features: ['Custom Colors', 'Logo Upload', 'Multiple Formats'],
        category: 'Utilities',
        popularity: 4
    },
    {
        id: 'password-generator',
        title: 'Password Generator',
        description: 'Create strong, random passwords with customizable rules and security options.',
        icon: VpnKey,
        path: '/password-generator',
        status: 'available',
        features: ['Custom Length', 'Character Types', 'Secure'],
        category: 'Security',
        popularity: 3
    },
    {
        id: 'mocking-text',
        title: 'Mocking Text Generator',
        description: 'Convert text to \'mOcKiNg TeXt\' case for sarcastic emphasis.',
        icon: TextFields,
        path: '/mocking-text',
        status: 'available',
        features: ['Alternating Case', 'Starts with Lowercase option'],
        category: 'Text Tools',
        popularity: 2
    },
    // Coming Soon Tools
    {
        id: 'image-optimizer',
        title: 'Image Optimizer',
        description: 'Compress and optimize images while maintaining quality for web and print.',
        icon: Update,
        path: '/image-optimizer',
        status: 'coming-soon',
        features: ['Size Reduction', 'Quality Control', 'Multiple Formats'],
        category: 'Image Processing',
        popularity: 0
    },
    {
        id: 'text-from-image',
        title: 'Text from Image (OCR)',
        description: 'Extract text from images using Optical Character Recognition.',
        icon: DocumentScanner,
        path: '/text-from-image',
        status: 'coming-soon',
        features: ['Supports Various Formats', 'High Accuracy', 'Copy to Clipboard'],
        category: 'AI Tools',
        popularity: 0
    },
    {
        id: 'diff-checker',
        title: 'Diff Checker',
        description: 'Compare two text files to find the differences with syntax highlighting.',
        icon: CompareArrows,
        path: '/diff-checker',
        status: 'coming-soon',
        features: ['Side-by-Side View', 'Inline View', 'Syntax Highlighting'],
        category: 'Developer Tools',
        popularity: 0
    }
];

function ToolsGrid() {
    const navigate = useNavigate();
    const [hoveredCard, setHoveredCard] = useState(null);

    // Separate available and coming soon tools
    const availableTools = tools.filter(tool => tool.status === 'available')
        .sort((a, b) => b.popularity - a.popularity);
    const comingSoonTools = tools.filter(tool => tool.status === 'coming-soon');

    const renderToolCard = (tool, index) => {
        const IconComponent = tool.icon;
        const isHovered = hoveredCard === tool.id;
        const isAvailable = tool.status === 'available';

        return (
            <Grid item xs={12} sm={6} lg={4} key={tool.id}>
                <Fade in timeout={300 + index * 50}>
                    <Card
                        onMouseEnter={() => setHoveredCard(tool.id)}
                        onMouseLeave={() => setHoveredCard(null)}
                        sx={{
                            height: '100%',
                            maxHeight: 280, // Limit card height to prevent them from being too tall
                            display: 'flex',
                            flexDirection: 'column',
                            cursor: isAvailable ? 'pointer' : 'default',
                            transform: isHovered && isAvailable ? 'translateY(-4px)' : 'translateY(0)',
                            transition: 'all 0.3s ease',
                            boxShadow: isHovered && isAvailable
                                ? '0 8px 24px rgba(0,0,0,0.12)'
                                : '0 2px 8px rgba(0,0,0,0.08)',
                            opacity: isAvailable ? 1 : 0.7,
                            border: isAvailable ? '1px solid rgba(25,118,210,0.1)' : '1px solid rgba(0,0,0,0.1)'
                        }}
                        onClick={() => isAvailable && navigate(tool.path)}
                    >
                        <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                <Box
                                    sx={{
                                        width: 48,
                                        height: 48,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: 2,
                                        backgroundColor: isAvailable ? 'primary.main' : 'grey.300',
                                        mr: 2,
                                        flexShrink: 0, // Prevent icon container from shrinking
                                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                                        transition: 'transform 0.2s ease'
                                    }}
                                >
                                    <IconComponent
                                        sx={{
                                            fontSize: 24,
                                            color: 'white'
                                        }}
                                    />
                                </Box>
                                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                    <Typography
                                        variant="h6"
                                        sx={{
                                            fontWeight: 600,
                                            fontSize: '1.1rem',
                                            lineHeight: 1.2,
                                            mb: 0.5
                                        }}
                                    >
                                        {tool.title}
                                    </Typography>
                                    <Chip
                                        label={tool.category}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: 20,
                                            color: 'text.secondary',
                                            borderColor: 'grey.300'
                                        }}
                                    />
                                </Box>
                                <Chip
                                    label={isAvailable ? 'Available' : 'Coming Soon'}
                                    color={isAvailable ? 'success' : 'default'}
                                    size="small"
                                    sx={{ fontWeight: 500, flexShrink: 0 }}
                                />
                            </Box>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    mb: 2,
                                    lineHeight: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }}
                            >
                                {tool.description}
                            </Typography>

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                                {tool.features.slice(0, 3).map((feature) => (
                                    <Chip
                                        key={feature}
                                        label={feature}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: 22,
                                            borderColor: 'grey.300',
                                            color: 'text.secondary'
                                        }}
                                    />
                                ))}
                                {tool.features.length > 3 && (
                                    <Chip
                                        label={`+${tool.features.length - 3} more`}
                                        variant="outlined"
                                        size="small"
                                        sx={{
                                            fontSize: '0.7rem',
                                            height: 22,
                                            borderColor: 'grey.300',
                                            color: 'text.secondary'
                                        }}
                                    />
                                )}
                            </Box>
                        </CardContent>

                        <CardActions sx={{ pt: 0, pb: 2, px: 2.5 }}>
                            <Button
                                variant={isAvailable ? 'contained' : 'outlined'}
                                fullWidth
                                disabled={!isAvailable}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    isAvailable && navigate(tool.path);
                                }}
                                sx={{
                                    fontWeight: 600,
                                    py: 1
                                }}
                            >
                                {isAvailable ? 'Open Tool' : 'Coming Soon'}
                            </Button>
                        </CardActions>
                    </Card>
                </Fade>
            </Grid>
        );
    };

    return (
        <Container maxWidth="lg" sx={{ py: 1 }}>
            {/* Header Section */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
                <Typography
                    variant="h4"
                    gutterBottom
                    sx={{
                        fontWeight: 600,
                        color: 'text.primary',
                        mb: 1
                    }}
                >
                    Available Tools
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 500, mx: 'auto' }}>
                    Choose from our collection of free, privacy-focused utilities.
                </Typography>
            </Box>

            {/* Available Tools Section */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
                {availableTools.map((tool, index) => renderToolCard(tool, index))}
            </Grid>

            {/* Coming Soon Section */}
            {comingSoonTools.length > 0 && (
                <>
                    <Divider sx={{ mb: 3 }}>
                        <Chip
                            label="Coming Soon"
                            color="secondary"
                            variant="outlined"
                            sx={{ px: 2, fontWeight: 500 }}
                        />
                    </Divider>

                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ fontWeight: 500 }}>
                            Tools in Development
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            These features are currently being developed.
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {comingSoonTools.map((tool, index) => renderToolCard(tool, availableTools.length + index))}
                    </Grid>
                </>
            )}
        </Container>
    );
}

export default ToolsGrid;
