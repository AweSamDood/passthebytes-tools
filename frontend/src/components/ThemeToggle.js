import React, { useState } from 'react';
import {
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Tooltip,
    Box
} from '@mui/material';
import {
    LightMode,
    DarkMode,
    SettingsBrightness,
    Brightness6
} from '@mui/icons-material';
import { useTheme, THEME_MODES } from '../contexts/ThemeContext';

const ThemeToggle = () => {
    const { themeMode, changeTheme} = useTheme();
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleThemeChange = (mode) => {
        changeTheme(mode);
        handleClose();
    };

    const getCurrentIcon = () => {
        switch (themeMode) {
            case THEME_MODES.LIGHT:
                return <LightMode />;
            case THEME_MODES.DARK:
                return <DarkMode />;
            case THEME_MODES.SYSTEM:
                return <SettingsBrightness />;
            default:
                return <Brightness6 />;
        }
    };

    const getThemeLabel = (mode) => {
        switch (mode) {
            case THEME_MODES.LIGHT:
                return 'Light';
            case THEME_MODES.DARK:
                return 'Dark';
            case THEME_MODES.SYSTEM:
                return 'System';
            default:
                return 'Theme';
        }
    };

    return (
        <Box>
            <Tooltip title={`Current: ${getThemeLabel(themeMode)}`}>
                <IconButton
                    color="inherit"
                    onClick={handleClick}
                    sx={{
                        color: 'inherit',
                        transition: 'transform 0.2s ease',
                        '&:hover': {
                            transform: 'scale(1.1)',
                        }
                    }}
                >
                    {getCurrentIcon()}
                </IconButton>
            </Tooltip>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: {
                        minWidth: 140,
                        mt: 1,
                    }
                }}
            >
                <MenuItem
                    onClick={() => handleThemeChange(THEME_MODES.LIGHT)}
                    selected={themeMode === THEME_MODES.LIGHT}
                >
                    <ListItemIcon>
                        <LightMode fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Light</ListItemText>
                </MenuItem>

                <MenuItem
                    onClick={() => handleThemeChange(THEME_MODES.DARK)}
                    selected={themeMode === THEME_MODES.DARK}
                >
                    <ListItemIcon>
                        <DarkMode fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Dark</ListItemText>
                </MenuItem>

                <MenuItem
                    onClick={() => handleThemeChange(THEME_MODES.SYSTEM)}
                    selected={themeMode === THEME_MODES.SYSTEM}
                >
                    <ListItemIcon>
                        <SettingsBrightness fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>System</ListItemText>
                </MenuItem>
            </Menu>
        </Box>
    );
};

export default ThemeToggle;
