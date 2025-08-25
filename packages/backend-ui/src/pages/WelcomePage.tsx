import React from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Container,
  Paper,
  Grid,
  Card,
  CardContent,
  Avatar,
  Button,
  Tooltip,
  Divider
} from '@mui/material';
import {
  Brightness4,
  Brightness7,
  LogoutOutlined,
  Dashboard,
  Security,
  People,
  Settings
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface WelcomePageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ toggleTheme, isDarkMode }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  const features = [
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Role-Based Access Control',
      description: 'Manage user permissions with fine-grained RBAC system'
    },
    {
      icon: <People sx={{ fontSize: 40 }} />,
      title: 'User Management',
      description: 'Create and manage users, roles, and permissions'
    },
    {
      icon: <Dashboard sx={{ fontSize: 40 }} />,
      title: 'Admin Dashboard',
      description: 'Monitor system health and view analytics'
    },
    {
      icon: <Settings sx={{ fontSize: 40 }} />,
      title: 'System Configuration',
      description: 'Configure platform settings and integrations'
    }
  ];

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Keystone Platform
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {user?.email}
            </Typography>

            <Tooltip title="Toggle theme">
              <IconButton onClick={toggleTheme} color="inherit">
                {isDarkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>

            <Avatar sx={{ bgcolor: 'secondary.main', width: 32, height: 32 }}>
              {getInitials(user?.email || '')}
            </Avatar>

            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} color="inherit">
                <LogoutOutlined />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper
          sx={{
            p: 4,
            display: 'flex',
            flexDirection: 'column',
            background: (theme) =>
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 4,
          }}
        >
          <Typography variant="h3" gutterBottom>
            Welcome to Keystone
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Your enterprise-grade platform for building scalable applications
          </Typography>
          <Box sx={{ mt: 3 }}>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Logged in as: <strong>{user?.email}</strong>
            </Typography>
            <Typography variant="body1" sx={{ opacity: 0.9 }}>
              Roles: <strong>{user?.roles?.join(', ') || 'None'}</strong>
            </Typography>
          </Box>
        </Paper>

        <Typography variant="h5" gutterBottom sx={{ mb: 3 }}>
          Platform Features
        </Typography>

        <Grid container spacing={3}>
          {features.map((feature, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  transition: 'transform 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <CardContent sx={{ textAlign: 'center', flexGrow: 1 }}>
                  <Box sx={{ color: 'primary.main', mb: 2 }}>
                    {feature.icon}
                  </Box>
                  <Typography variant="h6" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {feature.description}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        <Paper sx={{ mt: 4, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Divider sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button variant="outlined" startIcon={<People />}>
              Manage Users
            </Button>
            <Button variant="outlined" startIcon={<Security />}>
              Configure Roles
            </Button>
            <Button variant="outlined" startIcon={<Settings />}>
              System Settings
            </Button>
            <Button variant="outlined" startIcon={<Dashboard />}>
              View Analytics
            </Button>
          </Box>
        </Paper>

        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Keystone Platform v1.0.0 - Minimal Viable Core
          </Typography>
          <Typography variant="body2" color="text.secondary">
            © 2024 Keystone. All rights reserved.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default WelcomePage;