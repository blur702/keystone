import { PluginContext } from '../../core/PluginSystem';
import { AddressService } from './services/AddressService';

/**
 * Address Validator Plugin
 * 
 * Validates and standardizes postal addresses using multiple providers
 * Integrates with Google Maps, Here, and Mapbox geocoding APIs
 */
export default class AddressValidatorPlugin {
  private context: PluginContext;
  private addressService: AddressService;

  constructor(context: PluginContext) {
    this.context = context;
    this.addressService = new AddressService(context);
  }

  /**
   * Initialize the plugin
   */
  async initialize(): Promise<void> {
    try {
      // Initialize address service
      await this.addressService.initialize();

      // Register event listeners
      this.context.api.on('user.address_updated', this.onAddressUpdated.bind(this));
      this.context.api.on('order.shipping_address_changed', this.onShippingAddressChanged.bind(this));

      // Log successful initialization
      this.context.api.log('info', 'Address Validator plugin initialized successfully', {
        provider: this.context.api.getConfig('provider'),
        cacheEnabled: this.context.api.getConfig('cacheResults')
      });

      // Emit initialization event
      await this.context.api.emit('initialized', {
        plugin: 'address-validator',
        version: '1.2.0',
        provider: this.context.api.getConfig('provider')
      });

    } catch (error) {
      this.context.api.log('error', 'Failed to initialize Address Validator plugin', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Cleanup when plugin is disabled
   */
  async cleanup(): Promise<void> {
    try {
      // Cleanup address service
      await this.addressService.cleanup();
      
      this.context.api.log('info', 'Address Validator plugin cleaned up');
      
      // Emit cleanup event
      await this.context.api.emit('cleanup', {
        plugin: 'address-validator',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      this.context.api.log('error', 'Error during Address Validator cleanup', {
        error: error.message
      });
      throw error;
    }
  }

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle user address update events
   */
  private async onAddressUpdated(data: any): Promise<void> {
    try {
      if (data.address) {
        const validation = await this.addressService.validateAddress(data.address);
        
        if (validation.isValid && validation.standardized) {
          // Update user record with standardized address
          await this.context.services.database.query(
            'UPDATE users SET address = $1, address_validated_at = NOW() WHERE id = $2',
            [JSON.stringify(validation.standardized), data.userId]
          );

          await this.context.api.emit('address.standardized', {
            userId: data.userId,
            originalAddress: data.address,
            standardizedAddress: validation.standardized
          });
        }
      }
    } catch (error) {
      this.context.api.log('error', 'Error handling address update', {
        error: error.message,
        userId: data.userId
      });
    }
  }

  /**
   * Handle shipping address changes
   */
  private async onShippingAddressChanged(data: any): Promise<void> {
    try {
      if (data.address) {
        const validation = await this.addressService.validateAddress(data.address);
        
        // Emit validation result for order processing
        await this.context.api.emit('address.validated', {
          orderId: data.orderId,
          validation,
          isShippingAddress: true
        });
      }
    } catch (error) {
      this.context.api.log('error', 'Error handling shipping address change', {
        error: error.message,
        orderId: data.orderId
      });
    }
  }

  // ============================================================================
  // API Route Handlers
  // ============================================================================

  /**
   * Validate a single address
   * POST /api/plugins/address-validator/validate
   */
  async validateAddress(req: any, res: any): Promise<void> {
    try {
      const { address, options = {} } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required'
        });
      }

      // Validate the address using the service
      const validation = await this.addressService.validateAddress(address, options);

      // Log the validation request
      this.context.api.log('info', 'Address validation requested', {
        userId: req.user?.id,
        addressSnippet: `${address.street1 || ''} ${address.city || ''}`.trim().substring(0, 50),
        provider: validation.provider,
        isValid: validation.isValid
      });

      // Emit validation event
      await this.context.api.emit('address.validated', {
        userId: req.user?.id,
        validation,
        source: 'api_request'
      });

      res.json({
        success: true,
        validation
      });

    } catch (error) {
      this.context.api.log('error', 'Address validation failed', {
        error: error.message,
        userId: req.user?.id
      });

      await this.context.api.emit('address.validation_failed', {
        userId: req.user?.id,
        error: error.message,
        address: req.body.address
      });

      res.status(500).json({
        success: false,
        error: 'Address validation failed',
        message: error.message
      });
    }
  }

  /**
   * Validate multiple addresses in batch
   * POST /api/plugins/address-validator/validate-batch
   */
  async validateBatch(req: any, res: any): Promise<void> {
    try {
      const { addresses, options = {} } = req.body;

      if (!Array.isArray(addresses) || addresses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Addresses array is required'
        });
      }

      if (addresses.length > 100) {
        return res.status(400).json({
          success: false,
          error: 'Maximum 100 addresses per batch'
        });
      }

      // Validate all addresses
      const results = await this.addressService.validateBatch(addresses, options);

      // Log batch validation
      this.context.api.log('info', 'Batch address validation completed', {
        userId: req.user?.id,
        count: addresses.length,
        successCount: results.filter(r => r.validation.isValid).length
      });

      res.json({
        success: true,
        results
      });

    } catch (error) {
      this.context.api.log('error', 'Batch address validation failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Batch validation failed',
        message: error.message
      });
    }
  }

  /**
   * Standardize an address without validation
   * POST /api/plugins/address-validator/standardize
   */
  async standardizeAddress(req: any, res: any): Promise<void> {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required'
        });
      }

      const standardized = await this.addressService.standardizeAddress(address);

      res.json({
        success: true,
        original: address,
        standardized
      });

    } catch (error) {
      this.context.api.log('error', 'Address standardization failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Standardization failed',
        message: error.message
      });
    }
  }

  /**
   * Geocode an address to coordinates
   * POST /api/plugins/address-validator/geocode
   */
  async geocodeAddress(req: any, res: any): Promise<void> {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          success: false,
          error: 'Address is required'
        });
      }

      const geocoding = await this.addressService.geocodeAddress(address);

      if (geocoding.coordinates) {
        await this.context.api.emit('geocoding.coordinates_found', {
          userId: req.user?.id,
          address,
          coordinates: geocoding.coordinates,
          provider: geocoding.provider
        });
      }

      res.json({
        success: true,
        geocoding
      });

    } catch (error) {
      this.context.api.log('error', 'Address geocoding failed', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Geocoding failed',
        message: error.message
      });
    }
  }

  /**
   * Get plugin health status
   * GET /api/plugins/address-validator/health
   */
  async getHealth(req: any, res: any): Promise<void> {
    try {
      const health = await this.addressService.getHealthStatus();

      res.json({
        success: true,
        status: health.status,
        details: health
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        status: 'unhealthy',
        error: error.message
      });
    }
  }

  /**
   * Get plugin metrics
   * GET /api/plugins/address-validator/metrics
   */
  async getMetrics(req: any, res: any): Promise<void> {
    try {
      const metrics = await this.addressService.getMetrics();

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get supported countries
   * GET /api/plugins/address-validator/countries
   */
  async getSupportedCountries(req: any, res: any): Promise<void> {
    try {
      const countries = await this.addressService.getSupportedCountries();

      res.json({
        success: true,
        countries
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Clear validation cache
   * DELETE /api/plugins/address-validator/cache
   */
  async clearCache(req: any, res: any): Promise<void> {
    try {
      const cleared = await this.addressService.clearCache();

      this.context.api.log('info', 'Address validation cache cleared', {
        userId: req.user?.id,
        clearedCount: cleared
      });

      res.json({
        success: true,
        message: 'Cache cleared successfully',
        clearedEntries: cleared
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
}