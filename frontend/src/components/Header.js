// src/components/Header.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Home, Build } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <AppBar
            position="static"
            sx={{
                borderRadius: 0, // Remove all rounded corners
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)' // Add subtle shadow instead
            }}
        >
            <Toolbar>
                <Build sx={{ mr: 2 }} />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    PassTheBytes Tools
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                        color="inherit"
                        startIcon={<Home />}
                        onClick={() => navigate('/')}
                        variant={location.pathname === '/' ? 'outlined' : 'text'}
                        sx={{
                            borderRadius: 1 // Keep slight rounding for the button only
                        }}
                    >
                        Home
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Header;