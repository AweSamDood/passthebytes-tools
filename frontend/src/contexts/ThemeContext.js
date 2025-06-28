import React, { createContext, useContext, useState, useEffect } from 'react';
import { createTheme } from '@mui/material/styles';

const ThemeContext = createContext();

// Theme mode options
export const THEME_MODES = {
    LIGHT: 'light',
    DARK: 'dark',
    SYSTEM: 'system'
};

// Get system preference
const getSystemTheme = () => {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
};

// Get stored theme preference or default to system
const getStoredTheme = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('themeMode');
        if (stored && Object.values(THEME_MODES).includes(stored)) {
            return stored;
        }
    }
    return THEME_MODES.SYSTEM;
};

// Create light theme
const createLightTheme = () => createTheme({
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
            paper: '#fefefe', // Soft white instead of pure white
        },
        text: {
            primary: '#1a202c', // Dark gray instead of pure black
            secondary: 'rgba(26, 32, 44, 0.7)', // Softer gray
        },
        grey: {
            50: '#fafafa',
            100: '#f5f5f5',
            200: '#eeeeee',
            300: '#e0e0e0',
            400: '#bdbdbd',
            500: '#9e9e9e',
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

// Create dark theme
const createDarkTheme = () => createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#1565c0', // Darker blue for buttons
            light: '#42a5f5',
            dark: '#0d47a1', // Even darker blue
        },
        secondary: {
            main: '#f48fb1',
            light: '#fce4ec',
            dark: '#e91e63',
        },
        success: {
            main: '#4caf50', // Green background for "Available" chips
            light: '#81c784',
            dark: '#388e3c',
            contrastText: '#f5f5f5', // Soft off-white instead of pure white
        },
        background: {
            default: '#0f1419', // Softer dark instead of pure black
            paper: '#1a1f2e', // Warmer dark gray instead of harsh dark
        },
        text: {
            primary: '#e2e8f0', // Soft light gray instead of pure white
            secondary: 'rgba(226, 232, 240, 0.7)', // Softer light gray
        },
        grey: {
            50: '#f7fafc',
            100: '#edf2f7',
            200: '#e2e8f0',
            300: '#cbd5e0',
            400: '#a0aec0',
            500: '#718096',
            600: '#4a5568',
            700: '#2d3748',
            800: '#1a202c',
            900: '#171923',
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
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    backgroundColor: '#1a1f2e', // Updated to match paper background
                    '&.MuiPaper-elevation3': {
                        boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
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
                    backgroundColor: '#1565c0', // Darker blue buttons
                    boxShadow: '0 2px 8px rgba(21,101,192,0.3)',
                    '&:hover': {
                        backgroundColor: '#0d47a1', // Even darker on hover
                        boxShadow: '0 4px 16px rgba(21,101,192,0.4)',
                    },
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        backgroundColor: 'rgba(226, 232, 240, 0.05)', // Using soft white color
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    backgroundColor: '#1a1f2e',
                    border: '1px solid rgba(226, 232, 240, 0.1)', // Using soft white
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

export const ThemeProvider = ({ children }) => {
    const [themeMode, setThemeMode] = useState(getStoredTheme());
    const [actualTheme, setActualTheme] = useState('light');

    // Update actual theme based on mode
    useEffect(() => {
        let newTheme;
        if (themeMode === THEME_MODES.SYSTEM) {
            newTheme = getSystemTheme();
        } else {
            newTheme = themeMode;
        }
        setActualTheme(newTheme);
    }, [themeMode]);

    // Listen for system theme changes
    useEffect(() => {
        if (themeMode === THEME_MODES.SYSTEM) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            const handleChange = (e) => {
                setActualTheme(e.matches ? 'dark' : 'light');
            };

            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, [themeMode]);

    // Save theme preference to localStorage
    useEffect(() => {
        localStorage.setItem('themeMode', themeMode);
    }, [themeMode]);

    const changeTheme = (mode) => {
        setThemeMode(mode);
    };

    const theme = actualTheme === 'dark' ? createDarkTheme() : createLightTheme();

    const value = {
        themeMode,
        actualTheme,
        changeTheme,
        theme,
        isDark: actualTheme === 'dark',
    };

    return (
        <ThemeContext.Provider value={value}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
