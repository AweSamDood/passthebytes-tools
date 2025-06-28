// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, Paper, Link, Fade } from '@mui/material';

import Header from './components/Header';
import ToolsGrid from './components/ToolsGrid';
import PngToPdfConverter from './components/PngToPdf/PngToPdfConverter';
import ImageConverter from './components/ImageConverter/ImageConverter';
import MockingText from './components/MockingText';
import PasswordGenerator from './components/PasswordGenerator/PasswordGenerator';
import QrCodeGenerator from './components/QrCodeGenerator/QrCodeGenerator';
import Footer from './components/Footer';
import YouTubeDownloader from './components/YouTubeDownloader/YouTubeDownloader';

// Create a custom theme with better design consistency
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
            light: '#42a5f5',
            dark: '#1565c0',
        },
        secondary: {
            main: '#dc004e',
            light: '#ff5983',
            dark: '#9a0036',
        },
        background: {
            default: '#f8fafc',
            paper: '#ffffff',
        },
        grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
        },
    },
    typography: {
        fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
        h3: {
            fontWeight: 700,
            fontSize: '2.2rem',
            '@media (max-width:600px)': {
                fontSize: '1.8rem',
            },
        },
        h4: {
            fontWeight: 600,
            fontSize: '1.8rem',
            '@media (max-width:600px)': {
                fontSize: '1.5rem',
            },
        },
        h6: {
            fontWeight: 500,
        },
        body1: {
            lineHeight: 1.6,
        },
        body2: {
            lineHeight: 1.5,
        },
    },
    shape: {
        borderRadius: 12,
    },
    components: {
        MuiPaper: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    '&.MuiPaper-elevation3': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    textTransform: 'none',
                    fontWeight: 600,
                    padding: '10px 24px',
                },
                containedPrimary: {
                    boxShadow: '0 2px 8px rgba(25,118,210,0.3)',
                    '&:hover': {
                        boxShadow: '0 4px 16px rgba(25,118,210,0.4)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                    },
                },
            },
        },
        MuiContainer: {
            styleOverrides: {
                root: {
                    '@media (max-width:600px)': {
                        paddingLeft: 16,
                        paddingRight: 16,
                    },
                },
            },
        },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                    bgcolor: 'background.default'
                }}>
                    <Header />
                    <Container
                        maxWidth="xl"
                        sx={{
                            mt: { xs: 1, sm: 2 },
                            mb: { xs: 1, sm: 2 },
                            flexGrow: 1,
                            px: { xs: 2, sm: 3 }
                        }}
                    >
                        <Fade in timeout={500}>
                            <Paper
                                elevation={1}
                                sx={{
                                    p: { xs: 1.5, sm: 2 },
                                    mb: { xs: 2, sm: 3 },
                                    backgroundColor: 'grey.50',
                                    border: '1px solid',
                                    borderColor: 'grey.200'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 500,
                                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                            flexGrow: 1
                                        }}
                                    >
                                        🔒 <strong>Privacy First:</strong> All files are processed locally and deleted immediately. No data is stored.{' '}
                                        <Link
                                            href="https://github.com/AweSamDood/passthebytes-tools"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            sx={{
                                                color: 'primary.main',
                                                textDecoration: 'none',
                                                fontWeight: 500,
                                                '&:hover': {
                                                    textDecoration: 'underline'
                                                }
                                            }}
                                        >
                                            View Source
                                        </Link>
                                    </Typography>
                                </Box>
                            </Paper>
                        </Fade>

                        <Fade in timeout={1000}>
                            <Box>
                                <Routes>
                                    <Route path="/" element={<ToolsGrid />} />
                                    <Route path="/png-to-pdf" element={<PngToPdfConverter />} />
                                    <Route path="/image-converter" element={<ImageConverter />} />
                                    <Route path="/mocking-text" element={<MockingText />} />
                                    <Route path="/password-generator" element={<PasswordGenerator />} />
                                    <Route path="/qr-code-generator" element={<QrCodeGenerator />} />
                                    <Route path="/youtube-downloader" element={<YouTubeDownloader />} />
                                </Routes>
                            </Box>
                        </Fade>
                    </Container>
                    <Footer />
                </Box>
            </Router>
        </ThemeProvider>
    );
}

export default App;
