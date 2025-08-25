import { createTheme, ThemeOptions } from '@mui/material/styles';

const commonOptions: ThemeOptions = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
};

export const lightTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
      light: '#8b9bf4',
      dark: '#4c63b6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#764ba2',
      light: '#9f6cb8',
      dark: '#5a3a7e',
      contrastText: '#ffffff',
    },
    background: {
      default: '#f5f7fa',
      paper: '#ffffff',
    },
    text: {
      primary: '#2d3748',
      secondary: '#718096',
    },
    error: {
      main: '#e53e3e',
    },
    warning: {
      main: '#ed8936',
    },
    info: {
      main: '#3182ce',
    },
    success: {
      main: '#38a169',
    },
  },
});

export const darkTheme = createTheme({
  ...commonOptions,
  palette: {
    mode: 'dark',
    primary: {
      main: '#8b9bf4',
      light: '#a8b5f7',
      dark: '#667eea',
      contrastText: '#000000',
    },
    secondary: {
      main: '#9f6cb8',
      light: '#b588ca',
      dark: '#764ba2',
      contrastText: '#000000',
    },
    background: {
      default: '#1a202c',
      paper: '#2d3748',
    },
    text: {
      primary: '#f7fafc',
      secondary: '#cbd5e0',
    },
    error: {
      main: '#fc8181',
    },
    warning: {
      main: '#f6ad55',
    },
    info: {
      main: '#63b3ed',
    },
    success: {
      main: '#68d391',
    },
  },
});