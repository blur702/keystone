import { Router, Request, Response, NextFunction } from 'express';
import { PluginLoader } from '../core/PluginLoader';
import { authenticateToken } from './auth';
import winston from 'winston';

const router = Router();

// Middleware to check admin permissions
const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user.roles.includes('admin') && !user.roles.includes('super_admin')) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(403).json({ error: 'Unauthorized' });
  }
};

// Get plugin loader from app
const getPluginLoader = (req: Request): PluginLoader => {
  return req.app.get('pluginLoader') as PluginLoader;
};

const getLogger = (req: Request): winston.Logger => {
  return req.app.get('logger') as winston.Logger;
};

// Get all plugins
router.get('/', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pluginLoader = getPluginLoader(req);
    const plugins = await pluginLoader.getAllPlugins();
    
    res.json({ plugins });
  } catch (error) {
    next(error);
  }
});

// Install a plugin
router.post('/:pluginName/install', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const pluginLoader = getPluginLoader(req);
    const logger = getLogger(req);
    
    await pluginLoader.installPlugin(pluginName);
    
    logger.info(`Plugin ${pluginName} installed by user ${(req as any).user.email}`);
    res.json({ message: `Plugin ${pluginName} installed successfully` });
  } catch (error: any) {
    next(error);
  }
});

// Uninstall a plugin
router.delete('/:pluginName/uninstall', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const pluginLoader = getPluginLoader(req);
    const logger = getLogger(req);
    
    await pluginLoader.uninstallPlugin(pluginName);
    
    logger.info(`Plugin ${pluginName} uninstalled by user ${(req as any).user.email}`);
    res.json({ message: `Plugin ${pluginName} uninstalled successfully` });
  } catch (error: any) {
    next(error);
  }
});

// Enable a plugin
router.post('/:pluginName/enable', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const pluginLoader = getPluginLoader(req);
    const logger = getLogger(req);
    
    await pluginLoader.enablePlugin(pluginName);
    
    logger.info(`Plugin ${pluginName} enabled by user ${(req as any).user.email}`);
    res.json({ message: `Plugin ${pluginName} enabled successfully` });
  } catch (error: any) {
    next(error);
  }
});

// Disable a plugin
router.post('/:pluginName/disable', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const pluginLoader = getPluginLoader(req);
    const logger = getLogger(req);
    
    await pluginLoader.disablePlugin(pluginName);
    
    logger.info(`Plugin ${pluginName} disabled by user ${(req as any).user.email}`);
    res.json({ message: `Plugin ${pluginName} disabled successfully` });
  } catch (error: any) {
    next(error);
  }
});

// Update plugin configuration
router.put('/:pluginName/config', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const { configuration } = req.body;
    
    if (!configuration) {
      return res.status(400).json({ error: 'Configuration is required' });
    }
    
    const pluginLoader = getPluginLoader(req);
    const logger = getLogger(req);
    
    await pluginLoader.updatePluginConfig(pluginName, configuration);
    
    logger.info(`Plugin ${pluginName} configuration updated by user ${(req as any).user.email}`);
    res.json({ message: `Plugin ${pluginName} configuration updated successfully` });
  } catch (error: any) {
    next(error);
  }
});

// Get plugin configuration schema
router.get('/:pluginName/config-schema', authenticateToken, requireAdmin, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { pluginName } = req.params;
    const pluginLoader = getPluginLoader(req);
    
    const plugins = await pluginLoader.getAllPlugins();
    const plugin = plugins.find(p => p.name === pluginName);
    
    if (!plugin) {
      return res.status(404).json({ error: `Plugin ${pluginName} not found` });
    }
    
    res.json({
      name: plugin.name,
      configuration: plugin.metadata.configuration || [],
      currentConfig: plugin.configuration,
    });
  } catch (error) {
    next(error);
  }
});

export default router;