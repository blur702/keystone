import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormGroup,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  ExpandMore,
  Security
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const RolesPage: React.FC = () => {
  const navigate = useNavigate();

  // Mock data for demonstration
  const roles = [
    {
      id: '1',
      name: 'admin',
      description: 'Full system administrator access',
      permissions: ['users.manage', 'roles.manage', 'settings.manage', 'analytics.view'],
      userCount: 1
    },
    {
      id: '2',
      name: 'user',
      description: 'Standard user access',
      permissions: ['analytics.view'],
      userCount: 5
    },
    {
      id: '3',
      name: 'viewer',
      description: 'Read-only access',
      permissions: ['analytics.view'],
      userCount: 10
    }
  ];

  const allPermissions = [
    { key: 'users.manage', label: 'Manage Users', description: 'Create, update, and delete users' },
    { key: 'roles.manage', label: 'Manage Roles', description: 'Create, update, and delete roles' },
    { key: 'settings.manage', label: 'Manage Settings', description: 'Update system settings' },
    { key: 'analytics.view', label: 'View Analytics', description: 'Access analytics dashboard' },
    { key: 'plugins.manage', label: 'Manage Plugins', description: 'Install and configure plugins' },
  ];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          Role Management
        </Typography>
      </Box>

      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {/* TODO: Add role dialog */}}
        >
          Create Role
        </Button>
      </Box>

      {roles.map((role) => (
        <Accordion key={role.id} sx={{ mb: 2 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
              <Security />
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="h6">{role.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {role.description}
                </Typography>
              </Box>
              <Chip label={`${role.userCount} users`} size="small" />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
              <Typography variant="subtitle2" gutterBottom>
                Permissions
              </Typography>
              <FormGroup>
                {allPermissions.map((permission) => (
                  <FormControlLabel
                    key={permission.key}
                    control={
                      <Checkbox
                        checked={role.permissions.includes(permission.key)}
                        disabled={role.name === 'admin'}
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2">{permission.label}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {permission.description}
                        </Typography>
                      </Box>
                    }
                  />
                ))}
              </FormGroup>
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  size="small" 
                  startIcon={<Edit />}
                  disabled={role.name === 'admin'}
                >
                  Edit Role
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="error"
                  startIcon={<Delete />}
                  disabled={role.name === 'admin' || role.name === 'user'}
                >
                  Delete Role
                </Button>
              </Box>
            </Paper>
          </AccordionDetails>
        </Accordion>
      ))}
    </Container>
  );
};

export default RolesPage;