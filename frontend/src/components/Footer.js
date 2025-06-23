// src/components/Footer.js
import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';

function Footer() {
    return (
        <Box
            component="footer"
            sx={{
                py: 3,
                px: 2,
                mt: 'auto',
                backgroundColor: (theme) =>
                    theme.palette.mode === 'light'
                        ? theme.palette.grey[200]
                        : theme.palette.grey[800],
            }}
        >
            <Container maxWidth="lg">
                <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1 }}>
                    <strong>Disclaimer:</strong> We care for your privacy. We collect absolutely no data, and all files are temporarily stored and instantly deleted after download. The full source code for this project is available on <Link color="inherit" href="https://github.com/AweSamDood/passthebytes-tools" target="_blank" rel="noopener noreferrer">GitHub</Link> for your review.
                </Typography>
                <Typography variant="body2" color="text.secondary" align="center">
                    {'Created with ❤️ by '}
                    <Link color="inherit" href="https://github.com/AweSamDood" target="_blank" rel="noopener noreferrer">
                        AweSamDood
                    </Link>
                </Typography>
            </Container>
        </Box>
    );
}

export default Footer;
