import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Chip,
  Divider,
  Paper,
  IconButton,
  Tooltip,
  Collapse,
  Stack,
  Fade
} from '@mui/material';
import {
  LocationOn as LocationOnIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  Map as MapIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as ContentCopyIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

const StyledCard = styled(Card)(({ theme }) => ({
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: theme.shadows[8],
  },
}));

const StatusChip = styled(Chip)(({ theme, status }) => ({
  fontWeight: 'bold',
  '& .MuiChip-icon': {
    fontSize: '1.2rem',
  },
  ...(status === 'valid' && {
    backgroundColor: theme.palette.success.light,
    color: theme.palette.success.contrastText,
  }),
  ...(status === 'invalid' && {
    backgroundColor: theme.palette.error.light,
    color: theme.palette.error.contrastText,
  }),
  ...(status === 'warning' && {
    backgroundColor: theme.palette.warning.light,
    color: theme.palette.warning.contrastText,
  }),
}));

/**
 * Address Validator Component
 * 
 * A comprehensive React component for validating, standardizing, and geocoding addresses
 * Integrates with the Keystone Address Validator plugin backend
 */
const AddressValidator = ({ 
  initialAddress = {}, 
  onValidation = () => {}, 
  showCoordinates = true,
  showAdvanced = false,
  autoValidate = false,
  theme = 'default'
}) => {
  // State management
  const [address, setAddress] = useState({
    street1: '',
    street2: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    ...initialAddress
  });

  const [validation, setValidation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showMap, setShowMap] = useState(false);

  // Auto-validate when address changes (if enabled)
  useEffect(() => {
    if (autoValidate && Object.values(address).some(value => value?.trim())) {
      const timeoutId = setTimeout(() => {
        validateAddress();
      }, 1000); // Debounce for 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [address, autoValidate]);

  /**
   * Validate the current address
   */
  const validateAddress = async () => {
    if (!Object.values(address).some(value => value?.trim())) {
      setError('Please enter at least one address field');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/plugins/address-validator/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          address,
          options: {
            includeCoordinates: showCoordinates,
            validateComponents: true
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Validation failed');
      }

      if (!data.success) {
        throw new Error(data.error || 'Validation failed');
      }

      setValidation(data.validation);
      onValidation(data.validation);

    } catch (err) {
      setError(err.message);
      setValidation(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Use standardized address
   */
  const useStandardizedAddress = () => {
    if (validation?.standardized) {
      setAddress(validation.standardized);
    }
  };

  /**
   * Clear all fields
   */
  const clearAddress = () => {
    setAddress({
      street1: '',
      street2: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    });
    setValidation(null);
    setError(null);
  };

  /**
   * Copy address to clipboard
   */
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Could show a snackbar here
  };

  /**
   * Handle input changes
   */
  const handleInputChange = (field) => (event) => {
    setAddress(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  /**
   * Get validation status for display
   */
  const getValidationStatus = () => {
    if (!validation) return null;
    
    if (validation.isValid) {
      return validation.confidence > 0.8 ? 'valid' : 'warning';
    }
    return 'invalid';
  };

  /**
   * Get status icon
   */
  const getStatusIcon = () => {
    const status = getValidationStatus();
    switch (status) {
      case 'valid':
        return <CheckCircleIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'invalid':
        return <ErrorIcon />;
      default:
        return <LocationOnIcon />;
    }
  };

  /**
   * Format coordinates for display
   */
  const formatCoordinates = (coords) => {
    if (!coords) return 'N/A';
    return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
  };

  return (
    <StyledCard elevation={3}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <LocationOnIcon sx={{ mr: 1, color: 'primary.main', fontSize: '2rem' }} />
          <Typography variant="h5" component="h2" sx={{ flexGrow: 1, fontWeight: 'bold' }}>
            Address Validator
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Clear all fields">
              <IconButton onClick={clearAddress} size="small">
                <ClearIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Refresh validation">
              <IconButton onClick={validateAddress} size="small" disabled={loading}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Address Form */}
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address Line 1"
              value={address.street1}
              onChange={handleInputChange('street1')}
              placeholder="123 Main Street"
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Street Address Line 2"
              value={address.street2}
              onChange={handleInputChange('street2')}
              placeholder="Apartment, suite, unit, building, floor, etc."
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="City"
              value={address.city}
              onChange={handleInputChange('city')}
              placeholder="San Francisco"
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="State/Province"
              value={address.state}
              onChange={handleInputChange('state')}
              placeholder="CA"
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} sm={3}>
            <TextField
              fullWidth
              label="Postal Code"
              value={address.postalCode}
              onChange={handleInputChange('postalCode')}
              placeholder="94105"
              variant="outlined"
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Country"
              value={address.country}
              onChange={handleInputChange('country')}
              placeholder="United States"
              variant="outlined"
            />
          </Grid>
        </Grid>

        {/* Action Buttons */}
        <Box sx={{ mt: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={validateAddress}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : <LocationOnIcon />}
            sx={{ minWidth: 140 }}
          >
            {loading ? 'Validating...' : 'Validate Address'}
          </Button>

          {validation?.standardized && (
            <Button
              variant="outlined"
              onClick={useStandardizedAddress}
              startIcon={<CheckCircleIcon />}
            >
              Use Standardized
            </Button>
          )}

          {validation?.coordinates && (
            <Button
              variant="outlined"
              onClick={() => setShowMap(!showMap)}
              startIcon={<MapIcon />}
            >
              {showMap ? 'Hide Map' : 'Show Map'}
            </Button>
          )}
        </Box>

        {/* Error Display */}
        {error && (
          <Fade in>
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          </Fade>
        )}

        {/* Validation Results */}
        {validation && (
          <Fade in>
            <Paper elevation={2} sx={{ mt: 3, p: 2 }}>
              {/* Status Header */}
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StatusChip
                  icon={getStatusIcon()}
                  label={validation.isValid ? 'Valid Address' : 'Invalid Address'}
                  status={getValidationStatus()}
                  variant="filled"
                />
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  Confidence: {Math.round(validation.confidence * 100)}%
                </Typography>
                <Typography variant="body2" sx={{ ml: 2, color: 'text.secondary' }}>
                  Provider: {validation.provider}
                </Typography>
              </Box>

              {/* Validation Messages */}
              {validation.warnings && validation.warnings.length > 0 && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Warnings:</Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validation.warnings.map((warning, idx) => (
                      <li key={idx}>{warning}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {validation.errors && validation.errors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Errors:</Typography>
                  <ul style={{ margin: 0, paddingLeft: '20px' }}>
                    {validation.errors.map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </Alert>
              )}

              {/* Standardized Address */}
              {validation.standardized && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Standardized Address:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Stack spacing={0.5}>
                      {validation.standardized.street1 && (
                        <Typography variant="body2">{validation.standardized.street1}</Typography>
                      )}
                      {validation.standardized.street2 && (
                        <Typography variant="body2">{validation.standardized.street2}</Typography>
                      )}
                      <Typography variant="body2">
                        {[
                          validation.standardized.city,
                          validation.standardized.state,
                          validation.standardized.postalCode
                        ].filter(Boolean).join(', ')}
                      </Typography>
                      {validation.standardized.country && (
                        <Typography variant="body2">{validation.standardized.country}</Typography>
                      )}
                    </Stack>
                    <Tooltip title="Copy address">
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(JSON.stringify(validation.standardized, null, 2))}
                        sx={{ mt: 1 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                </Box>
              )}

              {/* Coordinates */}
              {showCoordinates && validation.coordinates && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Coordinates:
                  </Typography>
                  <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="body2">
                      Latitude: {validation.coordinates.latitude}
                    </Typography>
                    <Typography variant="body2">
                      Longitude: {validation.coordinates.longitude}
                    </Typography>
                    {validation.coordinates.accuracy && (
                      <Typography variant="body2" color="text.secondary">
                        Accuracy: {validation.coordinates.accuracy}
                      </Typography>
                    )}
                    <Tooltip title="Copy coordinates">
                      <IconButton 
                        size="small" 
                        onClick={() => copyToClipboard(formatCoordinates(validation.coordinates))}
                        sx={{ mt: 1 }}
                      >
                        <ContentCopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Paper>
                </Box>
              )}

              {/* Advanced Details */}
              {showAdvanced && (
                <Box>
                  <Button
                    onClick={() => setShowDetails(!showDetails)}
                    startIcon={showDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                    sx={{ mb: 1 }}
                  >
                    {showDetails ? 'Hide' : 'Show'} Details
                  </Button>
                  
                  <Collapse in={showDetails}>
                    <Divider sx={{ mb: 2 }} />
                    
                    {/* Address Components */}
                    {validation.components && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>
                          Address Components:
                        </Typography>
                        <Grid container spacing={1}>
                          {Object.entries(validation.components).map(([key, value]) => (
                            value && (
                              <Grid item xs={6} sm={4} md={3} key={key}>
                                <Chip
                                  label={`${key}: ${value}`}
                                  size="small"
                                  variant="outlined"
                                />
                              </Grid>
                            )
                          ))}
                        </Grid>
                      </Box>
                    )}

                    {/* Metadata */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Validation Metadata:
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Validated at: {new Date(validation.timestamp).toLocaleString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Provider: {validation.provider}
                      </Typography>
                    </Box>
                  </Collapse>
                </Box>
              )}
            </Paper>
          </Fade>
        )}

        {/* Map Display */}
        {showMap && validation?.coordinates && (
          <Collapse in={showMap}>
            <Paper elevation={2} sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Location Map
              </Typography>
              <Box
                sx={{
                  height: 300,
                  bgcolor: 'grey.100',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 1
                }}
              >
                <Typography color="text.secondary">
                  Map integration would be implemented here
                  <br />
                  Coordinates: {formatCoordinates(validation.coordinates)}
                </Typography>
              </Box>
            </Paper>
          </Collapse>
        )}
      </CardContent>
    </StyledCard>
  );
};

export default AddressValidator;