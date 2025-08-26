// Plugin Route Mounting Fix
// This code should be added to the server.js file after core routes are mounted

const path = require('path');
const fs = require('fs');

function mountPluginRoutes(app, logger) {
  try {
    logger.info('Mounting plugin routes manually...');
    
    // Check for address-validator plugin
    const pluginPath = path.join(__dirname, 'plugins', 'address-validator');
    
    if (fs.existsSync(pluginPath)) {
      logger.info('Found address-validator plugin directory');
      
      // Try different route file locations
      const routePaths = [
        path.join(pluginPath, 'routes', 'validator.js'),
        path.join(pluginPath, 'routes.js'),
        path.join(pluginPath, 'index.js')
      ];
      
      for (const routePath of routePaths) {
        if (fs.existsSync(routePath)) {
          logger.info(`Loading routes from: ${routePath}`);
          
          try {
            const routeModule = require(routePath);
            const router = routeModule.default || routeModule.router || routeModule;
            
            // Mount at multiple paths for compatibility
            app.use('/api/address-validator', router);
            app.use('/api/plugins/address-validator', router);
            app.use('/plugins/address-validator', router);
            
            logger.info('✅ Address validator routes mounted successfully at:');
            logger.info('  - /api/address-validator');
            logger.info('  - /api/plugins/address-validator');
            logger.info('  - /plugins/address-validator');
            
            break;
          } catch (error) {
            logger.error(`Failed to load route module from ${routePath}:`, error.message);
          }
        }
      }
      
      // Also try to mount a simple test endpoint
      app.get('/api/address-validator/health', (req, res) => {
        res.json({ 
          status: 'healthy', 
          plugin: 'address-validator',
          version: '1.0.0',
          timestamp: new Date().toISOString()
        });
      });
      
      app.get('/api/plugins/test', (req, res) => {
        res.json({ 
          message: 'Plugin system is working',
          plugins: ['address-validator'],
          timestamp: new Date().toISOString()
        });
      });
      
    } else {
      logger.warn('Address-validator plugin directory not found');
    }
    
  } catch (error) {
    logger.error('Failed to mount plugin routes:', error);
  }
}

module.exports = { mountPluginRoutes };