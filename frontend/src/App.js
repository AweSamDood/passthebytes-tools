// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, Paper, Link, Fade } from '@mui/material';

import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import Header from './components/Header';
import ToolsGrid from './components/ToolsGrid';
import PngToPdfConverter from './components/PngToPdf/PngToPdfConverter';
import ImageConverter from './components/ImageConverter/ImageConverter';
import MockingText from './components/MockingText';
import PasswordGenerator from './components/PasswordGenerator/PasswordGenerator';
import QrCodeGenerator from './components/QrCodeGenerator/QrCodeGenerator';
import Footer from './components/Footer';
import YouTubeDownloader from './components/YouTubeDownloader/YouTubeDownloader';

function AppContent() {
    const { theme, isDark } = useTheme();

    return (
        <MuiThemeProvider theme={theme}>
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
                                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'grey.50',
                                    border: '1px solid',
                                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'grey.200'
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontWeight: 500,
                                            fontSize: { xs: '0.8rem', sm: '0.875rem' },
                                            flexGrow: 1,
                                            color: isDark ? 'text.primary' : 'text.primary'
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
        </MuiThemeProvider>
    );
}

function App() {
    return (
        <ThemeProvider>
            <AppContent />
        </ThemeProvider>
    );
}

export default App;
