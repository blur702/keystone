import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { useAuth } from './contexts/AuthContext';
import LoginPage from './pages/LoginPage';
import WelcomePage from './pages/WelcomePage';
import UsersPage from './pages/UsersPage';
import RolesPage from './pages/RolesPage';
import SettingsPage from './pages/SettingsPage';
import ActivityLogsPage from './pages/ActivityLogsPage';
import { lightTheme, darkTheme } from './theme';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [isDarkMode, setIsDarkMode] = React.useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark';
  });

  const theme = React.useMemo(
    () => (isDarkMode ? darkTheme : lightTheme),
    [isDarkMode]
  );

  const toggleTheme = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem('theme', newMode ? 'dark' : 'light');
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Routes>
        <Route 
          path="/login" 
          element={
            isAuthenticated ? 
            <Navigate to="/" /> : 
            <LoginPage />
          } 
        />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <WelcomePage toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute>
              <UsersPage toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <RolesPage toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/activity"
          element={
            <ProtectedRoute>
              <ActivityLogsPage toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;