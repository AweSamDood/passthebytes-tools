// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Container } from '@mui/material';

import Header from './components/Header';
import ToolsGrid from './components/ToolsGrid';
import PngToPdfConverter from './components/PngToPdf/PngToPdfConverter';

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
                <Header />
                <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                    <Routes>
                        <Route path="/" element={<ToolsGrid />} />
                        <Route path="/png-to-pdf" element={<PngToPdfConverter />} />
                    </Routes>
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;
