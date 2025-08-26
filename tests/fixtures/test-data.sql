-- Test Data Fixtures for Staging Environment
-- Comprehensive realistic data for testing all features

BEGIN;

-- Clear existing test data
TRUNCATE TABLE 
    users, roles, permissions, user_roles, role_permissions,
    plugins, plugin_settings, email_logs, email_templates,
    events, event_subscriptions, api_keys, activity_logs
CASCADE;

-- Insert Roles
INSERT INTO roles (id, name, description, created_at) VALUES
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'super_admin', 'Super Administrator with all permissions', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'admin', 'Administrator with management permissions', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'plugin_manager', 'Can manage plugins and integrations', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'editor', 'Content editor with publishing rights', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'viewer', 'Read-only access to content', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', 'restricted', 'Minimal access for guest users', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', 'developer', 'Developer with API and debug access', NOW()),
    ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', 'support', 'Customer support representative', NOW());

-- Insert Permissions
INSERT INTO permissions (id, name, description, resource, action) VALUES
    -- User management
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'users:create', 'Create new users', 'users', 'create'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'users:read', 'View user information', 'users', 'read'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'users:update', 'Update user information', 'users', 'update'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'users:delete', 'Delete users', 'users', 'delete'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'users:manage', 'Full user management', 'users', 'manage'),
    
    -- Role management
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'roles:create', 'Create new roles', 'roles', 'create'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b07', 'roles:read', 'View roles', 'roles', 'read'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b08', 'roles:update', 'Update roles', 'roles', 'update'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b09', 'roles:delete', 'Delete roles', 'roles', 'delete'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b10', 'roles:manage', 'Full role management', 'roles', 'manage'),
    
    -- Plugin management
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b11', 'plugins:install', 'Install plugins', 'plugins', 'install'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b12', 'plugins:configure', 'Configure plugins', 'plugins', 'configure'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b13', 'plugins:enable', 'Enable/disable plugins', 'plugins', 'enable'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b14', 'plugins:delete', 'Uninstall plugins', 'plugins', 'delete'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b15', 'plugins:manage', 'Full plugin management', 'plugins', 'manage'),
    
    -- Content management
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b16', 'content:create', 'Create content', 'content', 'create'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b17', 'content:read', 'View content', 'content', 'read'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b18', 'content:edit', 'Edit content', 'content', 'edit'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b19', 'content:delete', 'Delete content', 'content', 'delete'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b20', 'content:publish', 'Publish content', 'content', 'publish'),
    
    -- System settings
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b21', 'settings:read', 'View settings', 'settings', 'read'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'settings:update', 'Update settings', 'settings', 'update'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b23', 'settings:manage', 'Full settings management', 'settings', 'manage'),
    
    -- Analytics
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b24', 'analytics:view', 'View analytics', 'analytics', 'view'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b25', 'analytics:export', 'Export analytics', 'analytics', 'export'),
    
    -- Dashboard
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b26', 'dashboard:view', 'View dashboard', 'dashboard', 'view'),
    
    -- API access
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b27', 'api:access', 'API access', 'api', 'access'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b28', 'api:debug', 'API debugging', 'api', 'debug'),
    
    -- Media
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b29', 'media:upload', 'Upload media', 'media', 'upload'),
    ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b30', 'media:delete', 'Delete media', 'media', 'delete');

-- Assign permissions to roles
-- Super Admin gets everything
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id FROM permissions;

-- Admin gets most permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', id FROM permissions
WHERE name IN ('users:manage', 'roles:manage', 'plugins:manage', 'settings:manage', 'analytics:view', 'dashboard:view', 'content:create', 'content:edit', 'content:delete', 'content:publish');

-- Plugin Manager
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', id FROM permissions
WHERE name IN ('plugins:install', 'plugins:configure', 'plugins:enable', 'plugins:delete', 'plugins:manage', 'analytics:view', 'dashboard:view');

-- Editor
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', id FROM permissions
WHERE name IN ('content:create', 'content:read', 'content:edit', 'content:delete', 'content:publish', 'media:upload', 'dashboard:view');

-- Viewer
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', id FROM permissions
WHERE name IN ('content:read', 'analytics:view', 'dashboard:view');

-- Restricted
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', id FROM permissions
WHERE name = 'dashboard:view';

-- Developer
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', id FROM permissions
WHERE name IN ('api:access', 'api:debug', 'plugins:configure', 'analytics:view', 'dashboard:view');

-- Support
INSERT INTO role_permissions (role_id, permission_id)
SELECT 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', id FROM permissions
WHERE name IN ('users:read', 'content:read', 'analytics:view', 'dashboard:view');

-- Insert realistic test users
INSERT INTO users (id, username, email, password_hash, first_name, last_name, is_active, email_verified, created_at) VALUES
    -- Super Admins
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'amartinez', 'alexandra.martinez@keystone.com', '$2a$10$YourHashHere', 'Alexandra', 'Martinez', true, true, NOW()),
    
    -- Admins
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'dthompson', 'david.thompson@keystone.com', '$2a$10$YourHashHere', 'David', 'Thompson', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'sjohnson', 'sarah.johnson@techcorp.com', '$2a$10$YourHashHere', 'Sarah', 'Johnson', true, true, NOW()),
    
    -- Plugin Managers
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'jwong', 'jennifer.wong@keystone.com', '$2a$10$YourHashHere', 'Jennifer', 'Wong', true, true, NOW()),
    
    -- Editors
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'rgarcia', 'robert.garcia@keystone.com', '$2a$10$YourHashHere', 'Robert', 'Garcia', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'mchen', 'michael.chen@startup.io', '$2a$10$YourHashHere', 'Michael', 'Chen', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c07', 'lbrown', 'lisa.brown@contentco.com', '$2a$10$YourHashHere', 'Lisa', 'Brown', true, true, NOW()),
    
    -- Viewers
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c08', 'echen', 'emily.chen@keystone.com', '$2a$10$YourHashHere', 'Emily', 'Chen', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c09', 'jsmith', 'john.smith@client.com', '$2a$10$YourHashHere', 'John', 'Smith', true, true, NOW()),
    
    -- Restricted/Guest users
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c10', 'guestuser', 'guest.user@external.com', '$2a$10$YourHashHere', 'Guest', 'User', true, false, NOW()),
    
    -- Developers
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'alee', 'andrew.lee@devteam.com', '$2a$10$YourHashHere', 'Andrew', 'Lee', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'kpatel', 'kavita.patel@techsolutions.io', '$2a$10$YourHashHere', 'Kavita', 'Patel', true, true, NOW()),
    
    -- Support
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'mjones', 'mary.jones@support.keystone.com', '$2a$10$YourHashHere', 'Mary', 'Jones', true, true, NOW()),
    
    -- Inactive users for testing
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c14', 'inactive1', 'inactive.user@test.com', '$2a$10$YourHashHere', 'Inactive', 'Account', false, false, NOW()),
    
    -- Users with special characters in names
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c15', 'modonnell', 'marie.odonnell@irish.com', '$2a$10$YourHashHere', 'Marie', 'O''Donnell', true, true, NOW()),
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c16', 'jmuller', 'jürgen.müller@deutsch.de', '$2a$10$YourHashHere', 'Jürgen', 'Müller', true, true, NOW());

-- Assign users to roles
INSERT INTO user_roles (user_id, role_id) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'), -- amartinez -> super_admin
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'), -- dthompson -> admin
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12'), -- sjohnson -> admin
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13'), -- jwong -> plugin_manager
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'), -- rgarcia -> editor
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c06', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'), -- mchen -> editor
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c07', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14'), -- lbrown -> editor
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c08', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'), -- echen -> viewer
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c09', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15'), -- jsmith -> viewer
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c10', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16'), -- guestuser -> restricted
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c11', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'), -- alee -> developer
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c12', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17'), -- kpatel -> developer
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c13', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18'); -- mjones -> support

-- Insert test plugins
INSERT INTO plugins (id, name, version, description, author, is_enabled, is_installed, configuration, metadata) VALUES
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', 'address-validator', '1.0.0', 'Validates and standardizes addresses using multiple providers', 'Keystone Team', true, true, 
     '{"providers": ["google", "here", "mapbox"], "defaultProvider": "google", "cacheEnabled": true}',
     '{"category": "validation", "tags": ["address", "geocoding", "validation"]}'),
    
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d02', 'email-campaign', '2.1.0', 'Email marketing campaign management', 'Marketing Team', true, true,
     '{"provider": "brevo", "dailyLimit": 1000, "templates": ["welcome", "newsletter", "promotion"]}',
     '{"category": "marketing", "tags": ["email", "campaigns", "automation"]}'),
    
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d03', 'analytics-dashboard', '1.5.2', 'Advanced analytics and reporting', 'Analytics Team', true, true,
     '{"refreshInterval": 300, "dataRetention": 90, "exportFormats": ["pdf", "csv", "json"]}',
     '{"category": "analytics", "tags": ["reporting", "metrics", "dashboard"]}'),
    
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d04', 'backup-manager', '3.0.0', 'Automated backup and restore', 'DevOps Team', false, true,
     '{"schedule": "0 2 * * *", "retention": 30, "destinations": ["s3", "local"]}',
     '{"category": "system", "tags": ["backup", "restore", "disaster-recovery"]}'),
    
    ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d05', 'seo-optimizer', '1.2.0', 'SEO optimization tools', 'SEO Team', true, true,
     '{"autoOptimize": true, "sitemapEnabled": true, "schemaMarkup": true}',
     '{"category": "seo", "tags": ["seo", "optimization", "search"]}');

-- Insert email templates
INSERT INTO email_templates (id, name, subject, html_content, text_content, variables) VALUES
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', 'welcome', 'Welcome to Keystone!', 
     '<h1>Welcome {{firstName}}!</h1><p>Thank you for joining Keystone.</p>',
     'Welcome {{firstName}}! Thank you for joining Keystone.',
     '["firstName", "lastName", "email"]'),
    
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', 'password-reset', 'Reset Your Password',
     '<p>Click <a href="{{resetLink}}">here</a> to reset your password.</p>',
     'Visit this link to reset your password: {{resetLink}}',
     '["resetLink", "expiresIn"]'),
    
    ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', 'notification', 'New Notification',
     '<p>You have a new notification: {{message}}</p>',
     'You have a new notification: {{message}}',
     '["message", "actionUrl"]');

-- Insert API keys (encrypted values would be real in production)
INSERT INTO api_keys (id, name, provider, encrypted_key, encrypted_secret, metadata, is_active) VALUES
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', 'Google Maps API', 'google_maps', 'encrypted_key_here', null,
     '{"usage": "geocoding", "quota": 2500}', true),
    
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f02', 'Brevo Email API', 'brevo', 'encrypted_key_here', 'encrypted_secret_here',
     '{"usage": "transactional_email", "dailyLimit": 1000}', true),
    
    ('f0eebc99-9c0b-4ef8-bb6d-6bb9bd380f03', 'Here Maps API', 'here_maps', 'encrypted_key_here', 'encrypted_secret_here',
     '{"usage": "geocoding", "quota": 1000}', true);

-- Insert sample events
INSERT INTO events (id, type, source, data, metadata) VALUES
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g01', 'user.created', 'auth-service',
     '{"userId": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01", "email": "alexandra.martinez@keystone.com"}',
     '{"ip": "192.168.1.100", "userAgent": "Mozilla/5.0"}'),
    
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g02', 'plugin.installed', 'plugin-manager',
     '{"pluginId": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01", "name": "address-validator"}',
     '{"installedBy": "admin", "version": "1.0.0"}'),
    
    ('g0eebc99-9c0b-4ef8-bb6d-6bb9bd380g03', 'login.success', 'auth-service',
     '{"userId": "c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02", "timestamp": "2024-01-15T10:30:00Z"}',
     '{"ip": "10.0.0.50", "location": "New York, US"}');

-- Insert activity logs
INSERT INTO activity_logs (user_id, action, resource, resource_id, ip_address, metadata) VALUES
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'create', 'user', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', '192.168.1.100'::inet,
     '{"changes": {"role": "admin"}}'),
    
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'update', 'plugin', 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380d01', '192.168.1.101'::inet,
     '{"changes": {"enabled": true}}'),
    
    ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'login', 'auth', null, '10.0.0.50'::inet,
     '{"success": true, "method": "password"}');

COMMIT;

-- Update sequences to avoid conflicts
SELECT setval('users_id_seq', (SELECT MAX(id) FROM users) + 1000);
SELECT setval('roles_id_seq', (SELECT MAX(id) FROM roles) + 1000);
SELECT setval('permissions_id_seq', (SELECT MAX(id) FROM permissions) + 1000);