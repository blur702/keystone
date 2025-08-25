-- Plugins and Services Tables Migration
-- Complete platform core tables

-- Plugins table
CREATE TABLE IF NOT EXISTS plugins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    version VARCHAR(50) NOT NULL,
    description TEXT,
    author VARCHAR(255),
    is_enabled BOOLEAN DEFAULT false,
    is_installed BOOLEAN DEFAULT true,
    configuration JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    installed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email logs table
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_addresses JSONB NOT NULL,
    from_address JSONB NOT NULL,
    subject VARCHAR(500),
    status VARCHAR(50),
    message_id VARCHAR(255),
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email templates table
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    brevo_id INTEGER,
    name VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    variables JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inbound emails table
CREATE TABLE IF NOT EXISTS inbound_emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_address JSONB NOT NULL,
    to_addresses JSONB NOT NULL,
    subject VARCHAR(500),
    html_content TEXT,
    text_content TEXT,
    attachments JSONB DEFAULT '[]',
    headers JSONB DEFAULT '{}',
    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Email events table
CREATE TABLE IF NOT EXISTS email_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id VARCHAR(255),
    event VARCHAR(50),
    email VARCHAR(255),
    data JSONB,
    occurred_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Events table for event sourcing
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(100) NOT NULL,
    source VARCHAR(100) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    version VARCHAR(20) DEFAULT '1.0'
);

-- Event subscriptions table
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event VARCHAR(100) NOT NULL,
    subscriber VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API keys table for external services
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    provider VARCHAR(100) UNIQUE NOT NULL,
    encrypted_key TEXT NOT NULL,
    encrypted_secret TEXT,
    metadata JSONB DEFAULT '{}',
    rate_limit JSONB,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- API requests log table
CREATE TABLE IF NOT EXISTS api_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider VARCHAR(100) NOT NULL,
    endpoint VARCHAR(500),
    method VARCHAR(10),
    params JSONB,
    headers JSONB,
    data JSONB,
    status INTEGER,
    response_data JSONB,
    response_headers JSONB,
    error JSONB,
    duration INTEGER,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Support tickets table (for email integration)
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    from_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    content TEXT,
    status VARCHAR(50) DEFAULT 'open',
    priority VARCHAR(20) DEFAULT 'normal',
    assigned_to UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add email fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS email_opt_out BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_valid BOOLEAN DEFAULT true;

-- Indexes for performance
CREATE INDEX idx_plugins_name ON plugins(name);
CREATE INDEX idx_plugins_enabled ON plugins(is_enabled);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_sent ON email_logs(sent_at);
CREATE INDEX idx_email_events_message ON email_events(message_id);
CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_source ON events(source);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_api_requests_provider ON api_requests(provider);
CREATE INDEX idx_api_requests_timestamp ON api_requests(timestamp);
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_email ON support_tickets(from_email);