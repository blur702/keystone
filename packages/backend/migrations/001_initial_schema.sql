-- Initial database schema for Keystone platform
-- Creates core tables for users, roles, permissions, plugins, and system functionality

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "postgis_topology";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create enum types
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended', 'deleted');
CREATE TYPE plugin_status AS ENUM ('installed', 'enabled', 'disabled', 'error');
CREATE TYPE email_status AS ENUM ('pending', 'sent', 'delivered', 'bounced', 'failed');
CREATE TYPE ticket_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- ============================================================================
-- USERS AND AUTHENTICATION
-- ============================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    phone VARCHAR(50),
    status user_status DEFAULT 'active',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    email_verified_at TIMESTAMP,
    email_opt_out BOOLEAN DEFAULT false,
    email_valid BOOLEAN DEFAULT true,
    last_login TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP
);

-- Create indexes for users
CREATE INDEX idx_users_email ON users USING btree(email);
CREATE INDEX idx_users_username ON users USING btree(username);
CREATE INDEX idx_users_status ON users USING btree(status);
CREATE INDEX idx_users_created_at ON users USING btree(created_at DESC);
CREATE INDEX idx_users_metadata ON users USING gin(metadata);

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_system BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(resource, action)
);

-- User roles junction table
CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_id)
);

-- Role permissions junction table
CREATE TABLE IF NOT EXISTS role_permissions (
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (role_id, permission_id)
);

-- Sessions table
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sessions_user_id ON sessions USING btree(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions USING btree(expires_at);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- PLUGINS SYSTEM
-- ============================================================================

-- Plugins table
CREATE TABLE IF NOT EXISTS plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(200),
    homepage VARCHAR(500),
    repository VARCHAR(500),
    status plugin_status DEFAULT 'installed',
    is_core BOOLEAN DEFAULT false,
    dependencies JSONB DEFAULT '[]',
    configuration JSONB DEFAULT '{}',
    permissions_required JSONB DEFAULT '[]',
    routes JSONB DEFAULT '[]',
    hooks JSONB DEFAULT '[]',
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    enabled_at TIMESTAMP,
    disabled_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_plugins_status ON plugins USING btree(status);
CREATE INDEX idx_plugins_name ON plugins USING btree(name);

-- Plugin settings
CREATE TABLE IF NOT EXISTS plugin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
    key VARCHAR(200) NOT NULL,
    value JSONB,
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(plugin_id, key)
);

-- Plugin permissions
CREATE TABLE IF NOT EXISTS plugin_permissions (
    plugin_id UUID REFERENCES plugins(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (plugin_id, permission_id)
);

-- ============================================================================
-- EMAIL SYSTEM
-- ============================================================================

-- Email templates
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brevo_id INTEGER,
    name VARCHAR(200) UNIQUE NOT NULL,
    subject VARCHAR(500) NOT NULL,
    html_content TEXT,
    text_content TEXT,
    variables JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255),
    to_addresses JSONB NOT NULL,
    from_address JSONB NOT NULL,
    subject VARCHAR(500),
    template_id UUID REFERENCES email_templates(id),
    status email_status DEFAULT 'pending',
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    error_message TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_email_logs_status ON email_logs USING btree(status);
CREATE INDEX idx_email_logs_sent_at ON email_logs USING btree(sent_at DESC);

-- Email events
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255),
    event VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    data JSONB,
    occurred_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inbound emails
CREATE TABLE IF NOT EXISTS inbound_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_address JSONB NOT NULL,
    to_addresses JSONB NOT NULL,
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    attachments JSONB DEFAULT '[]',
    headers JSONB DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMP,
    received_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- EVENT SYSTEM
-- ============================================================================

-- Events table for event sourcing
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(200) NOT NULL,
    source VARCHAR(200) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    version VARCHAR(20) DEFAULT '1.0',
    timestamp TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_events_type ON events USING btree(type);
CREATE INDEX idx_events_source ON events USING btree(source);
CREATE INDEX idx_events_timestamp ON events USING btree(timestamp DESC);

-- Event subscriptions
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(200) NOT NULL,
    subscriber VARCHAR(200) NOT NULL,
    handler TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SUPPORT SYSTEM
-- ============================================================================

-- Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    from_email VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    content TEXT NOT NULL,
    status ticket_status DEFAULT 'open',
    priority INTEGER DEFAULT 3,
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_support_tickets_status ON support_tickets USING btree(status);
CREATE INDEX idx_support_tickets_user_id ON support_tickets USING btree(user_id);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets USING btree(assigned_to);

-- ============================================================================
-- AUDIT LOG
-- ============================================================================

-- Audit log for tracking all system changes
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(200) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs USING btree(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs USING btree(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs USING btree(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs USING btree(created_at DESC);

-- ============================================================================
-- SPATIAL DATA
-- ============================================================================

-- Locations table for spatial data
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    geom GEOMETRY(Point, 4326),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    postal_code VARCHAR(20),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create spatial index
CREATE INDEX idx_locations_geom ON locations USING GIST(geom);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- User permissions view
CREATE OR REPLACE VIEW user_permissions_view AS
SELECT DISTINCT
    ur.user_id,
    p.id as permission_id,
    p.resource,
    p.action,
    p.description
FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
JOIN users u ON ur.user_id = u.id
WHERE u.is_active = true;

-- Active sessions view
CREATE OR REPLACE VIEW active_sessions_view AS
SELECT 
    s.*,
    u.email,
    u.username,
    u.first_name,
    u.last_name
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.expires_at > CURRENT_TIMESTAMP
    AND u.is_active = true;

-- Plugin status view
CREATE OR REPLACE VIEW plugin_status_view AS
SELECT 
    p.*,
    COUNT(DISTINCT ps.id) as settings_count,
    COUNT(DISTINCT pp.permission_id) as permissions_count
FROM plugins p
LEFT JOIN plugin_settings ps ON p.id = ps.plugin_id
LEFT JOIN plugin_permissions pp ON p.id = pp.plugin_id
GROUP BY p.id;

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugins_updated_at BEFORE UPDATE ON plugins
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plugin_settings_updated_at BEFORE UPDATE ON plugin_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit log trigger function
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO audit_logs (
        user_id,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        created_at
    ) VALUES (
        current_setting('app.current_user_id', true)::UUID,
        TG_OP,
        TG_TABLE_NAME,
        COALESCE(NEW.id, OLD.id),
        CASE WHEN TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
        CURRENT_TIMESTAMP
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply audit triggers to critical tables
CREATE TRIGGER audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_user_roles AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_plugins AFTER INSERT OR UPDATE OR DELETE ON plugins
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default roles
INSERT INTO roles (name, description, is_system) VALUES
    ('super_admin', 'Super Administrator with full system access', true),
    ('admin', 'Administrator with management access', true),
    ('user', 'Regular user with standard access', true),
    ('guest', 'Guest user with limited access', true)
ON CONFLICT (name) DO NOTHING;

-- Insert default permissions
INSERT INTO permissions (resource, action, description) VALUES
    ('users', 'create', 'Create new users'),
    ('users', 'read', 'View user information'),
    ('users', 'update', 'Update user information'),
    ('users', 'delete', 'Delete users'),
    ('roles', 'create', 'Create new roles'),
    ('roles', 'read', 'View role information'),
    ('roles', 'update', 'Update role information'),
    ('roles', 'delete', 'Delete roles'),
    ('plugins', 'install', 'Install new plugins'),
    ('plugins', 'enable', 'Enable plugins'),
    ('plugins', 'disable', 'Disable plugins'),
    ('plugins', 'configure', 'Configure plugin settings'),
    ('system', 'configure', 'Configure system settings'),
    ('system', 'monitor', 'Monitor system health and metrics')
ON CONFLICT (resource, action) DO NOTHING;

-- Grant all permissions to super_admin role
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id 
FROM roles r, permissions p
WHERE r.name = 'super_admin'
ON CONFLICT DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE users IS 'Core user accounts table';
COMMENT ON TABLE roles IS 'User roles for RBAC';
COMMENT ON TABLE permissions IS 'System permissions';
COMMENT ON TABLE plugins IS 'Installed plugins registry';
COMMENT ON TABLE events IS 'Event sourcing log';
COMMENT ON TABLE audit_logs IS 'Audit trail for all system changes';