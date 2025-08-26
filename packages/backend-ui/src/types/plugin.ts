export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  status: 'enabled' | 'disabled' | 'error' | 'not_installed';
  is_core?: boolean;
  installed_at?: string;
  updated_at?: string;
  homepage?: string;
  repository?: string;
  config?: Record<string, any>;
  metadata?: {
    icon?: string;
    category?: string;
    dependencies?: string[];
    permissions?: string[];
  };
}

export interface PluginConfig {
  [key: string]: any;
}

export interface PluginInstallRequest {
  name: string;
  version?: string;
  source?: 'npm' | 'git' | 'local';
  url?: string;
}