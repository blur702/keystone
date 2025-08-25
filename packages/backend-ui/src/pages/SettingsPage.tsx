import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  AppBar,
  Toolbar,
  Avatar,
  Tooltip,
  IconButton,
  Tabs,
  Tab,
  Divider,
  Alert,
  FormGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Brightness4,
  Brightness7,
  Logout,
  Settings as SettingsIcon,
  Security,
  Email,
  Storage,
  CloudUpload
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

interface SettingsPageProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ toggleTheme, isDarkMode }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [tabValue, setTabValue] = useState(0);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  
  // General Settings State
  const [siteName, setSiteName] = useState('Keystone Platform');
  const [siteUrl, setSiteUrl] = useState('https://kevinalthaus.com');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  
  // Security Settings State
  const [twoFactorAuth, setTwoFactorAuth] = useState(false);
  const [sessionTimeout, setSessionTimeout] = useState('24');
  const [passwordPolicy, setPasswordPolicy] = useState('medium');
  const [maxLoginAttempts, setMaxLoginAttempts] = useState('5');
  
  // Email Settings State
  const [smtpHost, setSmtpHost] = useState('smtp.example.com');
  const [smtpPort, setSmtpPort] = useState('587');
  const [smtpUser, setSmtpUser] = useState('noreply@kevinalthaus.com');
  const [smtpPassword, setSmtpPassword] = useState('');
  
  // Database Settings State
  const [dbHost, setDbHost] = useState('postgres');
  const [dbPort, setDbPort] = useState('5432');
  const [dbName, setDbName] = useState('keystone');
  const [backupEnabled, setBackupEnabled] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSave = () => {
    // TODO: Implement actual save logic
    setSaveMessage('Settings saved successfully!');
    setTimeout(() => setSaveMessage(null), 3000);
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
            System Settings
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
        {saveMessage && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveMessage(null)}>
            {saveMessage}
          </Alert>
        )}

        <Paper sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="settings tabs">
              <Tab icon={<SettingsIcon />} label="General" />
              <Tab icon={<Security />} label="Security" />
              <Tab icon={<Email />} label="Email" />
              <Tab icon={<Storage />} label="Database" />
            </Tabs>
          </Box>

          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              General Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Site Name"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                fullWidth
                helperText="The name of your platform"
              />
              
              <TextField
                label="Site URL"
                value={siteUrl}
                onChange={(e) => setSiteUrl(e.target.value)}
                fullWidth
                helperText="The primary URL of your site"
              />
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                    />
                  }
                  label="Maintenance Mode"
                />
                <Typography variant="caption" color="text.secondary">
                  When enabled, only administrators can access the site
                </Typography>
              </FormGroup>
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={registrationEnabled}
                      onChange={(e) => setRegistrationEnabled(e.target.checked)}
                    />
                  }
                  label="Enable User Registration"
                />
                <Typography variant="caption" color="text.secondary">
                  Allow new users to register accounts
                </Typography>
              </FormGroup>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              Security Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={twoFactorAuth}
                      onChange={(e) => setTwoFactorAuth(e.target.checked)}
                    />
                  }
                  label="Require Two-Factor Authentication"
                />
                <Typography variant="caption" color="text.secondary">
                  Enforce 2FA for all users
                </Typography>
              </FormGroup>
              
              <TextField
                label="Session Timeout (hours)"
                type="number"
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                fullWidth
                helperText="Automatically log out users after this period of inactivity"
              />
              
              <FormControl fullWidth>
                <InputLabel>Password Policy</InputLabel>
                <Select
                  value={passwordPolicy}
                  onChange={(e) => setPasswordPolicy(e.target.value)}
                  label="Password Policy"
                >
                  <MenuItem value="low">Low - 6+ characters</MenuItem>
                  <MenuItem value="medium">Medium - 8+ chars, mixed case, numbers</MenuItem>
                  <MenuItem value="high">High - 12+ chars, mixed case, numbers, symbols</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                label="Max Login Attempts"
                type="number"
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(e.target.value)}
                fullWidth
                helperText="Lock account after this many failed login attempts"
              />
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              Email Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="SMTP Host"
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                fullWidth
                helperText="Your email server hostname"
              />
              
              <TextField
                label="SMTP Port"
                value={smtpPort}
                onChange={(e) => setSmtpPort(e.target.value)}
                fullWidth
                helperText="Usually 587 for TLS or 465 for SSL"
              />
              
              <TextField
                label="SMTP Username"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                fullWidth
                helperText="Email account username"
              />
              
              <TextField
                label="SMTP Password"
                type="password"
                value={smtpPassword}
                onChange={(e) => setSmtpPassword(e.target.value)}
                fullWidth
                helperText="Email account password"
              />
              
              <Button
                variant="outlined"
                startIcon={<Email />}
                onClick={() => {/* TODO: Send test email */}}
              >
                Send Test Email
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              Database Settings
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <TextField
                label="Database Host"
                value={dbHost}
                onChange={(e) => setDbHost(e.target.value)}
                fullWidth
                helperText="PostgreSQL server hostname"
              />
              
              <TextField
                label="Database Port"
                value={dbPort}
                onChange={(e) => setDbPort(e.target.value)}
                fullWidth
                helperText="PostgreSQL server port"
              />
              
              <TextField
                label="Database Name"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                fullWidth
                helperText="Name of the database"
              />
              
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={backupEnabled}
                      onChange={(e) => setBackupEnabled(e.target.checked)}
                    />
                  }
                  label="Enable Automatic Backups"
                />
              </FormGroup>
              
              <FormControl fullWidth disabled={!backupEnabled}>
                <InputLabel>Backup Frequency</InputLabel>
                <Select
                  value={backupFrequency}
                  onChange={(e) => setBackupFrequency(e.target.value)}
                  label="Backup Frequency"
                >
                  <MenuItem value="hourly">Hourly</MenuItem>
                  <MenuItem value="daily">Daily</MenuItem>
                  <MenuItem value="weekly">Weekly</MenuItem>
                  <MenuItem value="monthly">Monthly</MenuItem>
                </Select>
              </FormControl>
              
              <Button
                variant="outlined"
                startIcon={<CloudUpload />}
                onClick={() => {/* TODO: Trigger manual backup */}}
              >
                Create Backup Now
              </Button>
            </Box>
          </TabPanel>

          <Box sx={{ p: 3, borderTop: 1, borderColor: 'divider' }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              size="large"
            >
              Save Settings
            </Button>
          </Box>
        </Paper>
      </Container>
    </Box>
  );
};

export default SettingsPage;