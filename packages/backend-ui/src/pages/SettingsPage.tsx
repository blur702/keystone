import React from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  IconButton,
  Tabs,
  Tab,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Refresh
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

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
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = React.useState(0);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleSave = () => {
    // TODO: Implement save functionality
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <IconButton onClick={() => navigate('/')}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" component="h1">
          System Settings
        </Typography>
      </Box>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Settings saved successfully!
        </Alert>
      )}

      <Paper sx={{ p: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="General" />
          <Tab label="Security" />
          <Tab label="Email" />
          <Tab label="Database" />
          <Tab label="Monitoring" />
        </Tabs>

        <TabPanel value={tabValue} index={0}>
          <Typography variant="h6" gutterBottom>General Settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Application Name"
              defaultValue="Keystone Platform"
              fullWidth
            />
            <TextField
              label="Application URL"
              defaultValue="https://kevinalthaus.com"
              fullWidth
            />
            <FormControl fullWidth>
              <InputLabel>Time Zone</InputLabel>
              <Select defaultValue="UTC">
                <MenuItem value="UTC">UTC</MenuItem>
                <MenuItem value="America/New_York">America/New_York</MenuItem>
                <MenuItem value="America/Los_Angeles">America/Los_Angeles</MenuItem>
                <MenuItem value="Europe/London">Europe/London</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable maintenance mode"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>Security Settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="JWT Expiration (minutes)"
              type="number"
              defaultValue="15"
              fullWidth
            />
            <TextField
              label="Refresh Token Expiration (days)"
              type="number"
              defaultValue="7"
              fullWidth
            />
            <TextField
              label="Password Complexity"
              select
              defaultValue="medium"
              fullWidth
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
            </TextField>
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable two-factor authentication"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Require email verification"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>Email Settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="SMTP Host"
              defaultValue="smtp.gmail.com"
              fullWidth
            />
            <TextField
              label="SMTP Port"
              type="number"
              defaultValue="587"
              fullWidth
            />
            <TextField
              label="SMTP Username"
              defaultValue="noreply@kevinalthaus.com"
              fullWidth
            />
            <TextField
              label="SMTP Password"
              type="password"
              fullWidth
            />
            <TextField
              label="From Email"
              defaultValue="noreply@kevinalthaus.com"
              fullWidth
            />
            <TextField
              label="From Name"
              defaultValue="Keystone Platform"
              fullWidth
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>Database Settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Database Host"
              defaultValue="localhost"
              fullWidth
            />
            <TextField
              label="Database Port"
              type="number"
              defaultValue="5432"
              fullWidth
            />
            <TextField
              label="Database Name"
              defaultValue="keystone"
              fullWidth
            />
            <TextField
              label="Max Connections"
              type="number"
              defaultValue="20"
              fullWidth
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable connection pooling"
            />
            <FormControlLabel
              control={<Switch />}
              label="Enable PostGIS extensions"
            />
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={4}>
          <Typography variant="h6" gutterBottom>Monitoring Settings</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>Log Level</InputLabel>
              <Select defaultValue="info">
                <MenuItem value="error">Error</MenuItem>
                <MenuItem value="warn">Warning</MenuItem>
                <MenuItem value="info">Info</MenuItem>
                <MenuItem value="debug">Debug</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Metrics Retention (days)"
              type="number"
              defaultValue="30"
              fullWidth
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable performance monitoring"
            />
            <FormControlLabel
              control={<Switch defaultChecked />}
              label="Enable error tracking"
            />
            <FormControlLabel
              control={<Switch />}
              label="Enable debug mode"
            />
          </Box>
        </TabPanel>

        <Divider sx={{ my: 3 }} />
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => window.location.reload()}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Save Settings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default SettingsPage;