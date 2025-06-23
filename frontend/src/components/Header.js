// src/components/Header.js
import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Home, Build } from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';

function Header() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <AppBar position="static">
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
                    >
                        Home
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default Header;