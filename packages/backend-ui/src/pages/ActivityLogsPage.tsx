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
  AppBar,
  Toolbar,
  Avatar,
  Tooltip,
  IconButton,
  Chip,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Card,
  CardContent,
  TablePagination,
  CircularProgress
} from '@mui/material';
import {
  ArrowBack,
  Brightness4,
  Brightness7,
  Logout,
  Refresh,
  CheckCircle,
  Error,
  Warning,
  Timeline,
  TrendingUp,
  Person
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ActivityLog {
  id: number;
  user_id: number;
  username: string;
  action: string;
  resource: string;
  resource_id: number;
  details: any;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
  error_message: string;
  created_at: string;
}

interface ActivityStats {
  date: string;
  total_activities: number;
  unique_users: number;
  successful: number;
  failed: number;
}

interface ActivityLogsPageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const ActivityLogsPage: React.FC<ActivityLogsPageProps> = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<ActivityStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    userId: ''
  });

  const fetchActivityLogs = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const queryParams = new URLSearchParams({
        limit: rowsPerPage.toString(),
        offset: (page * rowsPerPage).toString(),
        ...(filters.action && { action: filters.action }),
        ...(filters.resource && { resource: filters.resource }),
        ...(filters.status && { status: filters.status }),
        ...(filters.userId && { userId: filters.userId })
      });

      const response = await fetch(`/api/activity-logs?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data.data);
        setTotalCount(data.pagination.total);
      }
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/activity-logs/stats?days=7', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch activity stats:', error);
    }
  };

  useEffect(() => {
    fetchActivityLogs();
    fetchStats();
  }, [page, rowsPerPage, filters]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle sx={{ fontSize: 20, color: 'success.main' }} />;
      case 'failure':
        return <Error sx={{ fontSize: 20, color: 'error.main' }} />;
      case 'warning':
        return <Warning sx={{ fontSize: 20, color: 'warning.main' }} />;
      default:
        return null;
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes('create') || action.includes('register')) return 'success';
    if (action.includes('delete')) return 'error';
    if (action.includes('update') || action.includes('edit')) return 'warning';
    if (action.includes('login') || action.includes('logout')) return 'info';
    return 'default';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const totalActivities = stats.reduce((sum, stat) => sum + stat.total_activities, 0);
  const totalUniqueUsers = stats.length > 0 ? Math.max(...stats.map(s => s.unique_users)) : 0;
  const successRate = totalActivities > 0 
    ? ((stats.reduce((sum, stat) => sum + stat.successful, 0) / totalActivities) * 100).toFixed(1)
    : '0';

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
            Activity Logs
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

      <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Timeline sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Total Activities</Typography>
                </Box>
                <Typography variant="h4">{totalActivities}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Last 7 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Person sx={{ mr: 1, color: 'info.main' }} />
                  <Typography variant="h6">Active Users</Typography>
                </Box>
                <Typography variant="h4">{totalUniqueUsers}</Typography>
                <Typography variant="caption" color="text.secondary">
                  Unique users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp sx={{ mr: 1, color: 'success.main' }} />
                  <Typography variant="h6">Success Rate</Typography>
                </Box>
                <Typography variant="h4">{successRate}%</Typography>
                <Typography variant="caption" color="text.secondary">
                  Successful operations
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Error sx={{ mr: 1, color: 'error.main' }} />
                  <Typography variant="h6">Failed Actions</Typography>
                </Box>
                <Typography variant="h4">
                  {stats.reduce((sum, stat) => sum + stat.failed, 0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last 7 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Activity Filters</Typography>
            <IconButton onClick={fetchActivityLogs} size="small">
              <Refresh />
            </IconButton>
          </Box>
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="User ID"
                value={filters.userId}
                onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Action</InputLabel>
                <Select
                  value={filters.action}
                  onChange={(e) => setFilters({ ...filters, action: e.target.value as string })}
                  label="Action"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="user.login">Login</MenuItem>
                  <MenuItem value="user.logout">Logout</MenuItem>
                  <MenuItem value="users.create">Create User</MenuItem>
                  <MenuItem value="users.update">Update User</MenuItem>
                  <MenuItem value="users.delete">Delete User</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Resource</InputLabel>
                <Select
                  value={filters.resource}
                  onChange={(e) => setFilters({ ...filters, resource: e.target.value as string })}
                  label="Resource"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="auth">Authentication</MenuItem>
                  <MenuItem value="users">Users</MenuItem>
                  <MenuItem value="roles">Roles</MenuItem>
                  <MenuItem value="settings">Settings</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value as string })}
                  label="Status"
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="success">Success</MenuItem>
                  <MenuItem value="failure">Failure</MenuItem>
                  <MenuItem value="warning">Warning</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </Paper>

        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Resource</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>IP Address</TableCell>
                  <TableCell>Details</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <Typography color="text.secondary">No activity logs found</Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{formatDate(log.created_at)}</TableCell>
                      <TableCell>{log.username || 'System'}</TableCell>
                      <TableCell>
                        <Chip
                          label={log.action}
                          size="small"
                          color={getActionColor(log.action) as any}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>{log.resource || '-'}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {getStatusIcon(log.status)}
                          <Typography variant="body2">{log.status}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell>{log.ip_address || '-'}</TableCell>
                      <TableCell>
                        {log.error_message ? (
                          <Tooltip title={log.error_message}>
                            <Typography variant="body2" color="error">
                              Error
                            </Typography>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {log.details?.statusCode || '-'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <TablePagination
            rowsPerPageOptions={[10, 25, 50, 100]}
            component="div"
            count={totalCount}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Paper>
      </Container>
    </Box>
  );
};

export default ActivityLogsPage;