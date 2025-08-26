// Quick patch to add plugin routes
const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    plugin: 'address-validator',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Validation endpoint
router.post('/validate', (req, res) => {
  const { address } = req.body || {};
  res.json({ 
    isValid: true,
    address: address,
    standardized: address || {},
    confidence: 0.95,
    message: 'Address validation endpoint is accessible (mock response)',
    provider: 'mock'
  });
});

// Info endpoint  
router.get('/info', (req, res) => {
  res.json({
    name: 'Address Validator Plugin',
    version: '1.0.0',
    endpoints: ['/health', '/validate', '/info']
  });
});

module.exports = router;
