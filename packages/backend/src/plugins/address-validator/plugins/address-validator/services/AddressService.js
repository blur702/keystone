"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressService = void 0;
const axios_1 = require("axios");
class AddressService {
    constructor(context) {
        this.context = context;
        this.cache = new Map();
        this.metrics = {
            totalRequests: 0,
            successfulValidations: 0,
            failedValidations: 0,
            cacheHitRate: 0,
            averageResponseTime: 0,
            providerUsage: {},
            countryCoverage: {}
        };
        this.providerConfigs = new Map();
    }
    async initialize() {
        // Initialize provider configurations
        this.setupProviders();
        // Start cache cleanup interval
        setInterval(() => this.cleanupCache(), 300000); // 5 minutes
        // Log initialization
        this.context.api.log('info', 'AddressService initialized', {
            primaryProvider: this.context.api.getConfig('provider'),
            cacheEnabled: this.context.api.getConfig('cacheResults')
        });
    }
    async cleanup() {
        // Clear cache
        this.cache.clear();
        this.context.api.log('info', 'AddressService cleanup completed');
    }
    /**
     * Validate a single address
     */
    async validateAddress(address, options = {}) {
        const startTime = Date.now();
        this.metrics.totalRequests++;
        try {
            // Generate cache key
            const cacheKey = this.generateCacheKey(address);
            // Check cache first if enabled
            if (this.context.api.getConfig('cacheResults')) {
                const cached = this.getFromCache(cacheKey);
                if (cached) {
                    this.updateMetrics(true, Date.now() - startTime, cached.provider);
                    return cached;
                }
            }
            // Validate input
            this.validateInput(address);
            // Get primary provider
            const provider = this.context.api.getConfig('provider');
            let result;
            try {
                result = await this.validateWithProvider(address, provider, options);
            }
            catch (error) {
                // Try fallback provider if available
                const fallbackProvider = this.context.api.getConfig('fallbackProvider');
                if (fallbackProvider && fallbackProvider !== 'none' && fallbackProvider !== provider) {
                    this.context.api.log('warn', 'Primary provider failed, trying fallback', {
                        primaryProvider: provider,
                        fallbackProvider,
                        error: error.message
                    });
                    result = await this.validateWithProvider(address, fallbackProvider, options);
                }
                else {
                    throw error;
                }
            }
            // Cache result if enabled
            if (this.context.api.getConfig('cacheResults')) {
                this.setCache(cacheKey, result);
            }
            this.updateMetrics(true, Date.now() - startTime, result.provider);
            this.metrics.successfulValidations++;
            return result;
        }
        catch (error) {
            this.updateMetrics(false, Date.now() - startTime, 'unknown');
            this.metrics.failedValidations++;
            this.context.api.log('error', 'Address validation failed', {
                error: error.message,
                address: this.sanitizeAddress(address)
            });
            throw error;
        }
    }
    /**
     * Validate multiple addresses in batch
     */
    async validateBatch(addresses, options = {}) {
        const results = [];
        // Process in parallel with concurrency limit
        const concurrency = Math.min(addresses.length, 10);
        const batches = this.chunkArray(addresses.map((addr, idx) => ({ addr, idx })), concurrency);
        for (const batch of batches) {
            const batchPromises = batch.map(async ({ addr, idx }) => {
                try {
                    const validation = await this.validateAddress(addr, options);
                    return { index: idx, validation };
                }
                catch (error) {
                    return {
                        index: idx,
                        validation: {
                            isValid: false,
                            confidence: 0,
                            provider: 'error',
                            timestamp: new Date().toISOString(),
                            errors: [error.message]
                        }
                    };
                }
            });
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults);
        }
        return results.sort((a, b) => a.index - b.index);
    }
    /**
     * Standardize an address without validation
     */
    async standardizeAddress(address) {
        const validation = await this.validateAddress(address);
        return validation.standardized || address;
    }
    /**
     * Geocode an address to coordinates
     */
    async geocodeAddress(address) {
        const validation = await this.validateAddress(address);
        return {
            coordinates: validation.coordinates,
            address: validation.standardized,
            provider: validation.provider,
            confidence: validation.confidence
        };
    }
    /**
     * Get health status of the service and providers
     */
    async getHealthStatus() {
        const providers = {};
        // Check each provider
        for (const [providerName, config] of this.providerConfigs) {
            try {
                const startTime = Date.now();
                await this.checkProviderHealth(providerName);
                providers[providerName] = {
                    status: 'healthy',
                    responseTime: Date.now() - startTime,
                    lastCheck: new Date().toISOString()
                };
            }
            catch (error) {
                providers[providerName] = {
                    status: 'unhealthy',
                    lastCheck: new Date().toISOString(),
                    error: error.message
                };
            }
        }
        const healthyProviders = Object.values(providers).filter((p) => p.status === 'healthy').length;
        const totalProviders = Object.keys(providers).length;
        return {
            status: healthyProviders > 0 ? (healthyProviders === totalProviders ? 'healthy' : 'degraded') : 'unhealthy',
            providers,
            cache: {
                status: 'healthy',
                hitRate: this.calculateCacheHitRate(),
                size: this.cache.size
            }
        };
    }
    /**
     * Get service metrics
     */
    async getMetrics() {
        return {
            ...this.metrics,
            cacheHitRate: this.calculateCacheHitRate()
        };
    }
    /**
     * Get supported countries
     */
    async getSupportedCountries() {
        const provider = this.context.api.getConfig('provider');
        // Return country list based on provider capabilities
        switch (provider) {
            case 'google':
                return this.getGoogleSupportedCountries();
            case 'here':
                return this.getHereSupportedCountries();
            case 'mapbox':
                return this.getMapboxSupportedCountries();
            default:
                return [];
        }
    }
    /**
     * Clear validation cache
     */
    async clearCache() {
        const size = this.cache.size;
        this.cache.clear();
        return size;
    }
    // ============================================================================
    // Private Methods
    // ============================================================================
    setupProviders() {
        // Google Maps configuration
        this.providerConfigs.set('google', {
            baseUrl: 'https://maps.googleapis.com/maps/api/geocode/json',
            apiKey: this.context.api.getConfig('apiKey'),
            rateLimits: { requests: 1000, window: 86400 }
        });
        // Here configuration  
        this.providerConfigs.set('here', {
            baseUrl: 'https://geocode.search.hereapi.com/v1/geocode',
            apiKey: this.context.api.getConfig('apiKey'),
            rateLimits: { requests: 1000, window: 86400 }
        });
        // Mapbox configuration
        this.providerConfigs.set('mapbox', {
            baseUrl: 'https://api.mapbox.com/geocoding/v5/mapbox.places',
            apiKey: this.context.api.getConfig('apiKey'),
            rateLimits: { requests: 1000, window: 86400 }
        });
    }
    async validateWithProvider(address, provider, options) {
        const maxRetries = this.context.api.getConfig('maxRetries') || 2;
        let lastError;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                switch (provider) {
                    case 'google':
                        return await this.validateWithGoogle(address, options);
                    case 'here':
                        return await this.validateWithHere(address, options);
                    case 'mapbox':
                        return await this.validateWithMapbox(address, options);
                    default:
                        throw new Error(`Unsupported provider: ${provider}`);
                }
            }
            catch (error) {
                lastError = error;
                if (attempt < maxRetries) {
                    await this.delay(Math.pow(2, attempt) * 1000); // Exponential backoff
                }
            }
        }
        throw lastError;
    }
    async validateWithGoogle(address, options) {
        const config = this.providerConfigs.get('google');
        const addressString = this.formatAddressString(address);
        const response = await axios_1.default.get(config.baseUrl, {
            params: {
                address: addressString,
                key: config.apiKey,
                region: options.region || 'US'
            },
            timeout: 10000
        });
        if (response.data.status !== 'OK') {
            throw new Error(`Google API error: ${response.data.status}`);
        }
        const result = response.data.results[0];
        if (!result) {
            return {
                isValid: false,
                confidence: 0,
                provider: 'google',
                timestamp: new Date().toISOString(),
                errors: ['No results found']
            };
        }
        return {
            isValid: true,
            confidence: this.calculateGoogleConfidence(result),
            standardized: this.parseGoogleResult(result),
            components: this.parseGoogleComponents(result),
            coordinates: this.parseGoogleCoordinates(result),
            provider: 'google',
            timestamp: new Date().toISOString()
        };
    }
    async validateWithHere(address, options) {
        const config = this.providerConfigs.get('here');
        const addressString = this.formatAddressString(address);
        const response = await axios_1.default.get(config.baseUrl, {
            params: {
                q: addressString,
                apikey: config.apiKey,
                limit: 1
            },
            timeout: 10000
        });
        const items = response.data.items;
        if (!items || items.length === 0) {
            return {
                isValid: false,
                confidence: 0,
                provider: 'here',
                timestamp: new Date().toISOString(),
                errors: ['No results found']
            };
        }
        const result = items[0];
        return {
            isValid: true,
            confidence: result.scoring?.queryScore || 0.5,
            standardized: this.parseHereResult(result),
            components: this.parseHereComponents(result),
            coordinates: this.parseHereCoordinates(result),
            provider: 'here',
            timestamp: new Date().toISOString()
        };
    }
    async validateWithMapbox(address, options) {
        const config = this.providerConfigs.get('mapbox');
        const addressString = this.formatAddressString(address);
        const response = await axios_1.default.get(`${config.baseUrl}/${encodeURIComponent(addressString)}.json`, {
            params: {
                access_token: config.apiKey,
                limit: 1,
                types: 'address'
            },
            timeout: 10000
        });
        const features = response.data.features;
        if (!features || features.length === 0) {
            return {
                isValid: false,
                confidence: 0,
                provider: 'mapbox',
                timestamp: new Date().toISOString(),
                errors: ['No results found']
            };
        }
        const result = features[0];
        return {
            isValid: true,
            confidence: result.relevance || 0.5,
            standardized: this.parseMapboxResult(result),
            components: this.parseMapboxComponents(result),
            coordinates: this.parseMapboxCoordinates(result),
            provider: 'mapbox',
            timestamp: new Date().toISOString()
        };
    }
    // Result parsing methods for each provider
    parseGoogleResult(result) {
        const components = result.address_components;
        return {
            street1: this.extractGoogleComponent(components, ['street_number', 'route']),
            city: this.extractGoogleComponent(components, ['locality']),
            state: this.extractGoogleComponent(components, ['administrative_area_level_1'], 'short_name'),
            postalCode: this.extractGoogleComponent(components, ['postal_code']),
            country: this.extractGoogleComponent(components, ['country'], 'short_name')
        };
    }
    parseHereResult(result) {
        const address = result.address;
        return {
            street1: `${address.houseNumber || ''} ${address.street || ''}`.trim(),
            city: address.city,
            state: address.state,
            postalCode: address.postalCode,
            country: address.countryCode
        };
    }
    parseMapboxResult(result) {
        const properties = result.properties;
        const context = result.context || [];
        return {
            street1: properties.address || result.place_name.split(',')[0],
            city: this.extractMapboxContext(context, 'place'),
            state: this.extractMapboxContext(context, 'region'),
            postalCode: this.extractMapboxContext(context, 'postcode'),
            country: this.extractMapboxContext(context, 'country')
        };
    }
    // Helper methods
    generateCacheKey(address) {
        const normalized = {
            street1: address.street1?.toLowerCase().trim() || '',
            city: address.city?.toLowerCase().trim() || '',
            state: address.state?.toLowerCase().trim() || '',
            postalCode: address.postalCode?.toLowerCase().trim() || '',
            country: address.country?.toLowerCase().trim() || ''
        };
        return JSON.stringify(normalized);
    }
    getFromCache(key) {
        const cached = this.cache.get(key);
        if (cached && cached.expires > Date.now()) {
            return cached.result;
        }
        if (cached) {
            this.cache.delete(key);
        }
        return null;
    }
    setCache(key, result) {
        const ttl = this.context.api.getConfig('cacheTtl') || 86400;
        this.cache.set(key, {
            result,
            expires: Date.now() + (ttl * 1000)
        });
    }
    cleanupCache() {
        const now = Date.now();
        for (const [key, cached] of this.cache) {
            if (cached.expires <= now) {
                this.cache.delete(key);
            }
        }
    }
    validateInput(address) {
        if (!address || typeof address !== 'object') {
            throw new Error('Invalid address object');
        }
        if (!address.street1 && !address.city) {
            throw new Error('Address must include at least street or city');
        }
        // Country restrictions
        const allowedCountries = this.context.api.getConfig('allowedCountries');
        if (allowedCountries && allowedCountries.length > 0 && address.country) {
            if (!allowedCountries.includes(address.country.toUpperCase())) {
                throw new Error(`Country ${address.country} is not allowed`);
            }
        }
    }
    formatAddressString(address) {
        const parts = [
            address.street1,
            address.street2,
            address.city,
            address.state,
            address.postalCode,
            address.country
        ].filter(Boolean);
        return parts.join(', ');
    }
    sanitizeAddress(address) {
        return {
            street1: address.street1?.substring(0, 50),
            city: address.city,
            state: address.state,
            country: address.country
        };
    }
    updateMetrics(success, responseTime, provider) {
        this.metrics.averageResponseTime = (this.metrics.averageResponseTime + responseTime) / 2;
        this.metrics.providerUsage[provider] = (this.metrics.providerUsage[provider] || 0) + 1;
    }
    calculateCacheHitRate() {
        return this.metrics.totalRequests > 0 ?
            (this.cache.size / this.metrics.totalRequests) : 0;
    }
    chunkArray(array, size) {
        const chunks = [];
        for (let i = 0; i < array.length; i += size) {
            chunks.push(array.slice(i, i + size));
        }
        return chunks;
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    // Provider-specific helper methods
    extractGoogleComponent(components, types, nameType = 'long_name') {
        for (const component of components) {
            for (const type of types) {
                if (component.types.includes(type)) {
                    return component[nameType] || '';
                }
            }
        }
        return '';
    }
    extractMapboxContext(context, type) {
        const item = context.find(c => c.id.includes(type));
        return item ? item.text : '';
    }
    calculateGoogleConfidence(result) {
        // Google doesn't provide confidence directly, estimate based on result quality
        const hasPartialMatch = result.partial_match;
        const locationType = result.geometry?.location_type;
        if (hasPartialMatch)
            return 0.6;
        if (locationType === 'ROOFTOP')
            return 0.9;
        if (locationType === 'RANGE_INTERPOLATED')
            return 0.8;
        return 0.7;
    }
    parseGoogleComponents(result) {
        const components = result.address_components;
        return {
            streetNumber: this.extractGoogleComponent(components, ['street_number']),
            streetName: this.extractGoogleComponent(components, ['route']),
            locality: this.extractGoogleComponent(components, ['locality']),
            administrativeArea: this.extractGoogleComponent(components, ['administrative_area_level_1']),
            postalCode: this.extractGoogleComponent(components, ['postal_code']),
            country: this.extractGoogleComponent(components, ['country']),
            countryCode: this.extractGoogleComponent(components, ['country'], 'short_name'),
            formattedAddress: result.formatted_address
        };
    }
    parseGoogleCoordinates(result) {
        const geometry = result.geometry;
        return {
            latitude: geometry.location.lat,
            longitude: geometry.location.lng,
            accuracy: geometry.location_type,
            viewport: geometry.viewport
        };
    }
    parseHereComponents(result) {
        const address = result.address;
        return {
            streetNumber: address.houseNumber,
            streetName: address.street,
            locality: address.city,
            administrativeArea: address.state,
            postalCode: address.postalCode,
            country: address.country,
            countryCode: address.countryCode,
            formattedAddress: result.title
        };
    }
    parseHereCoordinates(result) {
        const position = result.position;
        return {
            latitude: position.lat,
            longitude: position.lng
        };
    }
    parseMapboxComponents(result) {
        const properties = result.properties;
        const context = result.context || [];
        return {
            streetName: properties.address,
            locality: this.extractMapboxContext(context, 'place'),
            administrativeArea: this.extractMapboxContext(context, 'region'),
            postalCode: this.extractMapboxContext(context, 'postcode'),
            country: this.extractMapboxContext(context, 'country'),
            formattedAddress: result.place_name
        };
    }
    parseMapboxCoordinates(result) {
        const coordinates = result.geometry.coordinates;
        return {
            latitude: coordinates[1],
            longitude: coordinates[0]
        };
    }
    async checkProviderHealth(provider) {
        // Simple health check - attempt to validate a known address
        const testAddress = {
            street1: '1600 Amphitheatre Parkway',
            city: 'Mountain View',
            state: 'CA',
            country: 'US'
        };
        await this.validateWithProvider(testAddress, provider, {});
    }
    getGoogleSupportedCountries() {
        return ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'JP', 'BR']; // Sample list
    }
    getHereSupportedCountries() {
        return ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'JP', 'BR']; // Sample list
    }
    getMapboxSupportedCountries() {
        return ['US', 'CA', 'GB', 'FR', 'DE', 'IT', 'ES', 'AU', 'JP', 'BR']; // Sample list
    }
}
exports.AddressService = AddressService;
