"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthenticationService = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const bcryptjs_1 = require("bcryptjs");
const eventemitter3_1 = require("eventemitter3");
const uuid_1 = require("uuid");
/**
 * AuthenticationService - Manages authentication, authorization, and RBAC
 * Provides JWT-based session management with role-based access control
 */
class AuthenticationService extends eventemitter3_1.EventEmitter {
    constructor(db, config, logger) {
        super();
        this.db = db;
        this.config = config;
        this.logger = logger;
    }
    static getInstance(db, config, logger) {
        if (!AuthenticationService.instance) {
            if (!db || !config || !logger) {
                throw new Error('AuthenticationService requires dependencies for initialization');
            }
            AuthenticationService.instance = new AuthenticationService(db, config, logger);
        }
        return AuthenticationService.instance;
    }
    /**
     * Initialize authentication service and create default roles
     */
    async initialize() {
        try {
            await this.createDefaultRolesAndPermissions();
            this.logger.info('Authentication service initialized');
        }
        catch (error) {
            this.logger.error('Failed to initialize authentication service', error);
            throw error;
        }
    }
    /**
     * Register a new user
     */
    async register(userData) {
        try {
            // Check if user exists
            const existingUser = await this.db.query('SELECT id FROM users WHERE email = $1 OR username = $2', [userData.email, userData.username]);
            if (existingUser.rows.length > 0) {
                throw new Error('User already exists with this email or username');
            }
            // Hash password
            const passwordHash = await bcryptjs_1.default.hash(userData.password, this.config.bcryptRounds);
            // Create user
            const result = await this.db.query(`INSERT INTO users (id, email, username, password_hash, first_name, last_name, is_active, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [
                (0, uuid_1.v4)(),
                userData.email,
                userData.username,
                passwordHash,
                userData.first_name,
                userData.last_name,
                true,
                false,
            ]);
            const user = result.rows[0];
            delete user.password_hash;
            // Assign default role
            await this.assignRole(user.id, AuthenticationService.ROLES.USER);
            this.emit('user:registered', user);
            this.logger.info(`User registered: ${user.email}`);
            return user;
        }
        catch (error) {
            this.logger.error('Registration failed', error);
            throw error;
        }
    }
    /**
     * Authenticate user and create session
     */
    async login(credentials) {
        try {
            // Get user - accept either email or username
            const result = await this.db.query('SELECT * FROM users WHERE (email = $1 OR username = $1) AND is_active = true', [credentials.email]);
            if (result.rows.length === 0) {
                throw new Error('Invalid credentials');
            }
            const user = result.rows[0];
            // Verify password
            const isValidPassword = await bcryptjs_1.default.compare(credentials.password, user.password_hash);
            if (!isValidPassword) {
                throw new Error('Invalid credentials');
            }
            // Get user roles and permissions
            const roles = await this.getUserRoles(user.id);
            const permissions = await this.getUserPermissions(user.id);
            // Create session
            const sessionId = (0, uuid_1.v4)();
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                roles: roles.map(r => r.name),
                permissions: permissions.map(p => `${p.resource}:${p.action}`),
                sessionId,
            };
            const token = jsonwebtoken_1.default.sign(tokenPayload, this.config.jwtSecret, {
                expiresIn: this.config.jwtExpiresIn,
            });
            const refreshToken = jsonwebtoken_1.default.sign({ sessionId, userId: user.id }, this.config.jwtSecret, { expiresIn: this.config.refreshTokenExpiresIn });
            // Store session
            await this.db.query(`INSERT INTO sessions (id, user_id, token, refresh_token, expires_at, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`, [
                sessionId,
                user.id,
                token,
                refreshToken,
                new Date(Date.now() + this.config.sessionTimeout),
                credentials.ip_address,
                credentials.user_agent,
            ]);
            // Update last login
            await this.db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
            delete user.password_hash;
            this.emit('user:login', user);
            this.logger.info(`User logged in: ${user.email}`);
            return { user, token, refreshToken };
        }
        catch (error) {
            this.logger.error('Login failed', error);
            throw error;
        }
    }
    /**
     * Verify JWT token
     */
    async verifyToken(token) {
        try {
            const payload = jsonwebtoken_1.default.verify(token, this.config.jwtSecret);
            // Check if session is still valid
            const session = await this.db.query('SELECT * FROM sessions WHERE id = $1 AND expires_at > NOW()', [payload.sessionId]);
            if (session.rows.length === 0) {
                throw new Error('Session expired or invalid');
            }
            return payload;
        }
        catch (error) {
            this.logger.error('Token verification failed', error);
            throw new Error('Invalid or expired token');
        }
    }
    /**
     * Refresh access token
     */
    async refreshToken(refreshToken) {
        try {
            const payload = jsonwebtoken_1.default.verify(refreshToken, this.config.jwtSecret);
            // Get session
            const sessionResult = await this.db.query('SELECT * FROM sessions WHERE id = $1 AND refresh_token = $2', [payload.sessionId, refreshToken]);
            if (sessionResult.rows.length === 0) {
                throw new Error('Invalid refresh token');
            }
            const session = sessionResult.rows[0];
            // Get user with roles and permissions
            const user = await this.getUserById(session.user_id);
            const roles = await this.getUserRoles(user.id);
            const permissions = await this.getUserPermissions(user.id);
            // Create new tokens
            const newSessionId = (0, uuid_1.v4)();
            const tokenPayload = {
                userId: user.id,
                email: user.email,
                roles: roles.map(r => r.name),
                permissions: permissions.map(p => `${p.resource}:${p.action}`),
                sessionId: newSessionId,
            };
            const newToken = jsonwebtoken_1.default.sign(tokenPayload, this.config.jwtSecret, {
                expiresIn: this.config.jwtExpiresIn,
            });
            const newRefreshToken = jsonwebtoken_1.default.sign({ sessionId: newSessionId, userId: user.id }, this.config.jwtSecret, { expiresIn: this.config.refreshTokenExpiresIn });
            // Update session
            await this.db.query(`UPDATE sessions SET id = $1, token = $2, refresh_token = $3, expires_at = $4 
         WHERE id = $5`, [
                newSessionId,
                newToken,
                newRefreshToken,
                new Date(Date.now() + this.config.sessionTimeout),
                session.id,
            ]);
            return { token: newToken, refreshToken: newRefreshToken };
        }
        catch (error) {
            this.logger.error('Token refresh failed', error);
            throw error;
        }
    }
    /**
     * Logout user
     */
    async logout(sessionId) {
        try {
            await this.db.query('DELETE FROM sessions WHERE id = $1', [sessionId]);
            this.emit('user:logout', sessionId);
            this.logger.info(`Session terminated: ${sessionId}`);
        }
        catch (error) {
            this.logger.error('Logout failed', error);
            throw error;
        }
    }
    /**
     * Check if user has permission
     */
    async hasPermission(userId, permission) {
        try {
            const [resource, action] = permission.split(':');
            const result = await this.db.query(`SELECT COUNT(*) FROM user_permissions_view
         WHERE user_id = $1 AND resource = $2 AND action = $3`, [userId, resource, action]);
            return parseInt(result.rows[0].count) > 0;
        }
        catch (error) {
            this.logger.error('Permission check failed', error);
            return false;
        }
    }
    /**
     * Check if user has role
     */
    async hasRole(userId, roleName) {
        try {
            const result = await this.db.query(`SELECT COUNT(*) FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
         WHERE ur.user_id = $1 AND r.name = $2`, [userId, roleName]);
            return parseInt(result.rows[0].count) > 0;
        }
        catch (error) {
            this.logger.error('Role check failed', error);
            return false;
        }
    }
    /**
     * Assign role to user
     */
    async assignRole(userId, roleName) {
        try {
            const roleResult = await this.db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
            if (roleResult.rows.length === 0) {
                throw new Error(`Role not found: ${roleName}`);
            }
            await this.db.query('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [userId, roleResult.rows[0].id]);
            // Clear permission cache
            await this.db.deleteFromCache(`permissions:${userId}:*`);
            this.logger.info(`Role ${roleName} assigned to user ${userId}`);
        }
        catch (error) {
            this.logger.error('Failed to assign role', error);
            throw error;
        }
    }
    /**
     * Remove role from user
     */
    async removeRole(userId, roleName) {
        try {
            const roleResult = await this.db.query('SELECT id FROM roles WHERE name = $1', [roleName]);
            if (roleResult.rows.length === 0) {
                throw new Error(`Role not found: ${roleName}`);
            }
            await this.db.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleResult.rows[0].id]);
            // Clear permission cache
            await this.db.deleteFromCache(`permissions:${userId}:*`);
            this.logger.info(`Role ${roleName} removed from user ${userId}`);
        }
        catch (error) {
            this.logger.error('Failed to remove role', error);
            throw error;
        }
    }
    /**
     * Get user by ID
     */
    async getUserById(userId) {
        const result = await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (result.rows.length === 0) {
            throw new Error('User not found');
        }
        const user = result.rows[0];
        delete user.password_hash;
        return user;
    }
    /**
     * Get user roles
     */
    async getUserRoles(userId) {
        const result = await this.db.query(`SELECT r.* FROM roles r
       JOIN user_roles ur ON r.id = ur.role_id
       WHERE ur.user_id = $1`, [userId], { cache: true, cacheTTL: 300, cacheKey: `roles:${userId}` });
        return result.rows;
    }
    /**
     * Get user permissions
     */
    async getUserPermissions(userId) {
        const result = await this.db.query(`SELECT DISTINCT p.* FROM permissions p
       JOIN role_permissions rp ON p.id = rp.permission_id
       JOIN user_roles ur ON rp.role_id = ur.role_id
       WHERE ur.user_id = $1`, [userId], { cache: true, cacheTTL: 300, cacheKey: `permissions:${userId}` });
        return result.rows;
    }
    /**
     * Create default roles and permissions
     */
    async createDefaultRolesAndPermissions() {
        try {
            // Create default roles
            const roles = [
                { name: AuthenticationService.ROLES.SUPER_ADMIN, description: 'Super Administrator with full system access' },
                { name: AuthenticationService.ROLES.ADMIN, description: 'Administrator with management access' },
                { name: AuthenticationService.ROLES.USER, description: 'Regular user with standard access' },
                { name: AuthenticationService.ROLES.GUEST, description: 'Guest user with limited access' },
            ];
            for (const role of roles) {
                await this.db.query(`INSERT INTO roles (id, name, description, is_system) 
           VALUES ($1, $2, $3, true) 
           ON CONFLICT (name) DO NOTHING`, [(0, uuid_1.v4)(), role.name, role.description]);
            }
            // Create default permissions
            const permissions = Object.entries(AuthenticationService.PERMISSIONS).map(([key, value]) => {
                const [resource, action] = value.split(':');
                return {
                    resource,
                    action,
                    description: key.replace(/_/g, ' ').toLowerCase(),
                };
            });
            for (const perm of permissions) {
                await this.db.query(`INSERT INTO permissions (id, resource, action, description)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (resource, action) DO NOTHING`, [(0, uuid_1.v4)(), perm.resource, perm.action, perm.description]);
            }
            // Assign all permissions to super_admin
            await this.db.query(`INSERT INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id FROM roles r, permissions p
         WHERE r.name = $1
         ON CONFLICT DO NOTHING`, [AuthenticationService.ROLES.SUPER_ADMIN]);
            this.logger.info('Default roles and permissions created');
        }
        catch (error) {
            this.logger.error('Failed to create default roles and permissions', error);
            throw error;
        }
    }
}
exports.AuthenticationService = AuthenticationService;
// System roles
AuthenticationService.ROLES = {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
    USER: 'user',
    GUEST: 'guest',
};
// System permissions format: resource:action
AuthenticationService.PERMISSIONS = {
    // User management
    USERS_CREATE: 'users:create',
    USERS_READ: 'users:read',
    USERS_UPDATE: 'users:update',
    USERS_DELETE: 'users:delete',
    // Role management
    ROLES_CREATE: 'roles:create',
    ROLES_READ: 'roles:read',
    ROLES_UPDATE: 'roles:update',
    ROLES_DELETE: 'roles:delete',
    // Plugin management
    PLUGINS_INSTALL: 'plugins:install',
    PLUGINS_ENABLE: 'plugins:enable',
    PLUGINS_DISABLE: 'plugins:disable',
    PLUGINS_CONFIGURE: 'plugins:configure',
    // System
    SYSTEM_CONFIGURE: 'system:configure',
    SYSTEM_MONITOR: 'system:monitor',
};
exports.default = AuthenticationService;
