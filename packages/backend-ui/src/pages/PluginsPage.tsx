import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tooltip,
  Switch,
  FormControlLabel,
  LinearProgress,
  Menu,
  MenuItem,
  Divider,
  Paper,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Settings as SettingsIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  CloudUpload as CloudUploadIcon,
  PowerSettingsNew as PowerIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Extension as ExtensionIcon,
  Update as UpdateIcon,
  Code as CodeIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { pluginService } from '../services/pluginService';
import { Plugin } from '../types/plugin';

const PluginsPage: React.FC = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [installDialogOpen, setInstallDialogOpen] = useState(false);
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Fetch plugins
  const { data: plugins = [], isLoading, error } = useQuery({
    queryKey: ['plugins'],
    queryFn: pluginService.getAllPlugins,
  });

  // Enable/Disable plugin mutation
  const togglePluginMutation = useMutation({
    mutationFn: ({ name, enable }: { name: string; enable: boolean }) =>
      enable ? pluginService.enablePlugin(name) : pluginService.disablePlugin(name),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      enqueueSnackbar(
        `Plugin ${variables.enable ? 'enabled' : 'disabled'} successfully`,
        { variant: 'success' }
      );
    },
    onError: (error: any) => {
      enqueueSnackbar(error.message || 'Failed to toggle plugin', {
        variant: 'error',
      });
    },
  });

  // Install plugin mutation
  const installPluginMutation = useMutation({
    mutationFn: (name: string) => pluginService.installPlugin(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      enqueueSnackbar('Plugin installed successfully', { variant: 'success' });
      setInstallDialogOpen(false);
      setUploadFile(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(error.message || 'Failed to install plugin', {
        variant: 'error',
      });
    },
  });

  // Uninstall plugin mutation
  const uninstallPluginMutation = useMutation({
    mutationFn: (name: string) => pluginService.uninstallPlugin(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
      enqueueSnackbar('Plugin uninstalled successfully', { variant: 'success' });
      setMenuAnchor(null);
      setSelectedPlugin(null);
    },
    onError: (error: any) => {
      enqueueSnackbar(error.message || 'Failed to uninstall plugin', {
        variant: 'error',
      });
    },
  });

  const handleTogglePlugin = (plugin: Plugin) => {
    togglePluginMutation.mutate({
      name: plugin.name,
      enable: plugin.status === 'disabled',
    });
  };

  const handleInstallPlugin = () => {
    if (!uploadFile) {
      enqueueSnackbar('Please select a plugin file', { variant: 'warning' });
      return;
    }

    // For now, just use the file name as the plugin name
    // In a real implementation, you'd upload the file to the server
    const pluginName = uploadFile.name.replace(/\.(zip|tar|gz)$/, '');
    installPluginMutation.mutate(pluginName);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, plugin: Plugin) => {
    setMenuAnchor(event.currentTarget);
    setSelectedPlugin(plugin);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleConfigure = () => {
    if (selectedPlugin) {
      navigate(`/plugins/${selectedPlugin.name}/config`);
    }
    handleMenuClose();
  };

  const handleUninstall = () => {
    if (selectedPlugin && window.confirm(`Are you sure you want to uninstall ${selectedPlugin.name}?`)) {
      uninstallPluginMutation.mutate(selectedPlugin.name);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <CheckCircleIcon color="success" />;
      case 'disabled':
        return <WarningIcon color="warning" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <InfoIcon color="info" />;
    }
  };

  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'enabled':
        return 'success';
      case 'disabled':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const filteredPlugins = plugins.filter((plugin: Plugin) =>
    plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    plugin.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LinearProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load plugins
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Plugin Management
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Install, configure, and manage plugins to extend platform functionality
        </Typography>
      </Box>

      {/* Actions Bar */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <TextField
            size="small"
            placeholder="Search plugins..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ flexGrow: 1, maxWidth: 400 }}
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setInstallDialogOpen(true)}
          >
            Install Plugin
          </Button>
        </Stack>
      </Paper>

      {/* Plugins Grid */}
      <Grid container spacing={3}>
        {filteredPlugins.map((plugin: Plugin) => (
          <Grid item xs={12} md={6} lg={4} key={plugin.id}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: (theme) => theme.shadows[8],
                },
              }}
            >
              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                  <ExtensionIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" component="div">
                      {plugin.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      v{plugin.version}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, plugin)}
                  >
                    <MoreVertIcon />
                  </IconButton>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {plugin.description || 'No description available'}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  {getStatusIcon(plugin.status)}
                  <Chip
                    label={plugin.status}
                    size="small"
                    color={getStatusColor(plugin.status)}
                    variant="outlined"
                  />
                  {plugin.is_core && (
                    <Chip label="Core" size="small" color="primary" />
                  )}
                </Box>

                {plugin.author && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    By {plugin.author}
                  </Typography>
                )}
              </CardContent>

              <Divider />

              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={plugin.status === 'enabled'}
                      onChange={() => handleTogglePlugin(plugin)}
                      disabled={plugin.status === 'error' || plugin.is_core}
                    />
                  }
                  label={plugin.status === 'enabled' ? 'Enabled' : 'Disabled'}
                />
                <Tooltip title="Configure">
                  <IconButton
                    size="small"
                    onClick={() => navigate(`/plugins/${plugin.name}/config`)}
                    disabled={plugin.status !== 'enabled'}
                  >
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {filteredPlugins.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center', mt: 4 }}>
          <ExtensionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No plugins found
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchTerm
              ? 'Try adjusting your search terms'
              : 'Install plugins to extend platform functionality'}
          </Typography>
          {!searchTerm && (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setInstallDialogOpen(true)}
            >
              Install First Plugin
            </Button>
          )}
        </Paper>
      )}

      {/* Plugin Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleConfigure}>
          <SettingsIcon sx={{ mr: 1 }} fontSize="small" />
          Configure
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlugin) {
              window.open(selectedPlugin.homepage, '_blank');
            }
            handleMenuClose();
          }}
          disabled={!selectedPlugin?.homepage}
        >
          <InfoIcon sx={{ mr: 1 }} fontSize="small" />
          View Documentation
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (selectedPlugin) {
              window.open(selectedPlugin.repository, '_blank');
            }
            handleMenuClose();
          }}
          disabled={!selectedPlugin?.repository}
        >
          <CodeIcon sx={{ mr: 1 }} fontSize="small" />
          View Source
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={handleUninstall}
          disabled={selectedPlugin?.is_core}
          sx={{ color: 'error.main' }}
        >
          <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
          Uninstall
        </MenuItem>
      </Menu>

      {/* Install Plugin Dialog */}
      <Dialog
        open={installDialogOpen}
        onClose={() => setInstallDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Install Plugin</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload a plugin package (.zip) to install
            </Typography>
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<CloudUploadIcon />}
              fullWidth
              sx={{ mb: 2, py: 2 }}
            >
              {uploadFile ? uploadFile.name : 'Select Plugin File'}
              <input
                type="file"
                hidden
                accept=".zip"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
            </Button>

            <Alert severity="info" variant="outlined">
              Plugins must be packaged as ZIP files containing a valid plugin.json manifest
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInstallDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleInstallPlugin}
            disabled={!uploadFile || installPluginMutation.isPending}
            startIcon={installPluginMutation.isPending ? <CircularProgress size={20} /> : null}
          >
            Install
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PluginsPage;