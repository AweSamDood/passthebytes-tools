// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container, Box, Typography, Paper, Link } from '@mui/material';

import Header from './components/Header';
import ToolsGrid from './components/ToolsGrid';
import PngToPdfConverter from './components/PngToPdf/PngToPdfConverter';
import ImageConverter from './components/ImageConverter/ImageConverter';
import PasswordGenerator from './components/PasswordGenerator/PasswordGenerator';
import QrCodeGenerator from './components/QrCodeGenerator/QrCodeGenerator';
import Footer from './components/Footer';
import YouTubeDownloader from './components/YouTubeDownloader/YouTubeDownloader';

// Create a custom theme
const theme = createTheme({
    palette: {
        mode: 'light',
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
        background: {
            default: '#f5f5f5',
        },
    },
    typography: {
        h4: {
            fontWeight: 600,
        },
        h6: {
            fontWeight: 500,
        },
    },
});

function App() {
    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Router>
                <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                    <Header />
                    <Container maxWidth="lg" sx={{ mt: 4, mb: 4, flexGrow: 1 }}>
                        <Paper elevation={2} sx={{ p: 3, mb: 4, backgroundColor: '#e3f2fd' }}>
                            <Typography variant="h6" color="primary.dark" gutterBottom>
                                Your Privacy is Our Priority
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                We are deeply committed to protecting your privacy. We collect absolutely no data, and all uploaded files are permanently deleted from our servers the moment they are processed. The entire project is open-source, and you can review the code on <Link href="https://github.com/AweSamDood/passthebytes-tools" target="_blank" rel="noopener noreferrer">GitHub</Link> to verify this for yourself.
                            </Typography>
                        </Paper>
                        <Routes>
                            <Route path="/" element={<ToolsGrid />} />
                            <Route path="/png-to-pdf" element={<PngToPdfConverter />} />
                            <Route path="/image-converter" element={<ImageConverter />} />
                            <Route path="/password-generator" element={<PasswordGenerator />} />
                            <Route path="/qr-code-generator" element={<QrCodeGenerator />} />
                            <Route path="/youtube-downloader" element={<YouTubeDownloader />} />
                        </Routes>
                    </Container>
                    <Footer />
                </Box>
            </Router>
        </ThemeProvider>
    );
}

export default App;
