import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  TextField,
  InputAdornment
} from '@mui/material';
import {
  ArrowBack,
  Add,
  Search,
  Edit,
  Delete,
  PersonAdd
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const UsersPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');

  // Mock data for demonstration
  const users = [
    {
      id: '1',
      email: 'admin@kevinalthaus.com',
      username: 'admin',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
      status: 'active',
      lastLogin: '2025-08-26T16:44:08.913Z'
    },
    {
      id: '2',
      email: 'kevin@kevinalthaus.com',
      username: 'kevin',
      firstName: 'Kevin',
      lastName: 'Althaus',
      roles: ['user'],
      status: 'active',
      lastLogin: '2025-08-26T17:06:29.586Z'
    }
  ];

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          User Management
        </Typography>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <TextField
            placeholder="Search users..."
            variant="outlined"
            size="small"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
            sx={{ width: 300 }}
          />
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => {/* TODO: Add user dialog */}}
          >
            Add User
          </Button>
        </Box>

        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Login</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.username}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{`${user.firstName} ${user.lastName}`}</TableCell>
                  <TableCell>
                    {user.roles.map(role => (
                      <Chip 
                        key={role} 
                        label={role} 
                        size="small" 
                        color={role === 'admin' ? 'error' : 'primary'}
                        sx={{ mr: 0.5 }}
                      />
                    ))}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.status}
                      size="small"
                      color={user.status === 'active' ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(user.lastLogin).toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" onClick={() => {/* TODO: Edit user */}}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => {/* TODO: Delete user */}}>
                      <Delete fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Container>
  );
};

export default UsersPage;