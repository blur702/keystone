import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Button,
  IconButton,
  Chip,
  AppBar,
  Toolbar,
  Avatar,
  Tooltip,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Edit,
  Delete,
  Security,
  ExpandMore,
  Brightness4,
  Brightness7,
  Logout
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface Permission {
  id: string;
  resource: string;
  action: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  userCount: number;
  createdAt: string;
}

interface RolesPageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const RolesPage: React.FC<RolesPageProps> = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRole, setExpandedRole] = useState<string | false>(false);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockRoles: Role[] = [
        {
          id: '1',
          name: 'admin',
          description: 'Full system administrator with all permissions',
          permissions: [
            { id: '1', resource: 'users', action: 'manage', description: 'Manage all users' },
            { id: '2', resource: 'roles', action: 'manage', description: 'Manage roles and permissions' },
            { id: '3', resource: 'settings', action: 'edit', description: 'Edit system settings' },
            { id: '4', resource: 'analytics', action: 'view', description: 'View analytics dashboard' }
          ],
          userCount: 1,
          createdAt: new Date().toISOString()
        },
        {
          id: '2',
          name: 'user',
          description: 'Standard user with basic permissions',
          permissions: [
            { id: '5', resource: 'profile', action: 'edit', description: 'Edit own profile' },
            { id: '6', resource: 'analytics', action: 'view', description: 'View analytics dashboard' }
          ],
          userCount: 5,
          createdAt: new Date().toISOString()
        },
        {
          id: '3',
          name: 'analyst',
          description: 'Analytics viewer with dashboard access',
          permissions: [
            { id: '7', resource: 'analytics', action: 'view', description: 'View analytics dashboard' },
            { id: '8', resource: 'reports', action: 'generate', description: 'Generate reports' }
          ],
          userCount: 3,
          createdAt: new Date().toISOString()
        }
      ];
      setRoles(mockRoles);
      setError(null);
    } catch (err) {
      setError('Failed to load roles');
      console.error('Error fetching roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleAccordionChange = (roleId: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedRole(isExpanded ? roleId : false);
  };

  return (
    <Box sx={{ flexGrow: 1, minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="static" elevation={1}>
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => navigate('/')}
            sx={{ mr: 2 }}
          >
            <ArrowBack />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Role Management
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
              {user?.email?.substring(0, 2).toUpperCase()}
            </Avatar>
            <Tooltip title="Logout">
              <IconButton onClick={handleLogout} color="inherit">
                <Logout />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Security color="primary" />
              <Typography variant="h5" component="h2">
                Roles & Permissions
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => {/* TODO: Implement add role dialog */}}
            >
              Create Role
            </Button>
          </Box>

          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {!loading && !error && (
            <Box>
              {roles.map((role) => (
                <Accordion
                  key={role.id}
                  expanded={expandedRole === role.id}
                  onChange={handleAccordionChange(role.id)}
                  sx={{ mb: 2 }}
                >
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', pr: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6">
                          {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {role.description}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Chip
                          label={`${role.userCount} users`}
                          size="small"
                          color="primary"
                          variant="outlined"
                        />
                        <Chip
                          label={`${role.permissions.length} permissions`}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            /* TODO: Edit role */
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            /* TODO: Delete role */
                          }}
                          disabled={role.name === 'admin'}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <TableContainer>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Resource</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Description</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {role.permissions.map((permission) => (
                            <TableRow key={permission.id}>
                              <TableCell>
                                <Chip
                                  label={permission.resource}
                                  size="small"
                                  sx={{ fontFamily: 'monospace' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Chip
                                  label={permission.action}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                  sx={{ fontFamily: 'monospace' }}
                                />
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2">
                                  {permission.description}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </AccordionDetails>
                </Accordion>
              ))}
            </Box>
          )}

          {!loading && !error && roles.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No roles found
              </Typography>
            </Box>
          )}
        </Paper>

        <Paper sx={{ mt: 3, p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Permission Reference
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Permissions follow the format: <code>resource:action</code>
          </Typography>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 2 }}>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">users:manage</Typography>
              <Typography variant="caption" color="text.secondary">Create, edit, delete users</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">roles:manage</Typography>
              <Typography variant="caption" color="text.secondary">Create, edit, delete roles</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">settings:edit</Typography>
              <Typography variant="caption" color="text.secondary">Modify system settings</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" fontWeight="bold">analytics:view</Typography>
              <Typography variant="caption" color="text.secondary">Access analytics dashboard</Typography>
            </Box>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default RolesPage;