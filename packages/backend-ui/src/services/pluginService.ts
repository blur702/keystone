import axios from 'axios';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  isEnabled: boolean;
  isInstalled: boolean;
  status: 'enabled' | 'disabled' | 'not_installed' | 'error';
  configuration: Record<string, any>;
  metadata: {
    dependencies?: string[];
    permissions?: string[];
    routes?: string[];
    hooks?: string[];
    configuration?: PluginConfigField[];
  };
  installedAt?: string;
  updatedAt?: string;
}

export interface PluginConfigField {
  key: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  label: string;
  description?: string;
  required: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    options?: any[];
  };
}

class PluginService {
  private baseURL = '/api/plugins';

  async getAllPlugins(): Promise<Plugin[]> {
    const response = await axios.get(`${this.baseURL}`);
    return response.data.plugins.map((plugin: any) => ({
      ...plugin,
      status: this.getPluginStatus(plugin),
    }));
  }

  async installPlugin(pluginName: string): Promise<void> {
    await axios.post(`${this.baseURL}/${pluginName}/install`);
  }

  async uninstallPlugin(pluginName: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${pluginName}/uninstall`);
  }

  async enablePlugin(pluginName: string): Promise<void> {
    await axios.post(`${this.baseURL}/${pluginName}/enable`);
  }

  async disablePlugin(pluginName: string): Promise<void> {
    await axios.post(`${this.baseURL}/${pluginName}/disable`);
  }

  async getPluginConfig(pluginName: string): Promise<{
    name: string;
    configuration: PluginConfigField[];
    currentConfig: Record<string, any>;
  }> {
    const response = await axios.get(`${this.baseURL}/${pluginName}/config-schema`);
    return response.data;
  }

  async updatePluginConfig(pluginName: string, configuration: Record<string, any>): Promise<void> {
    await axios.put(`${this.baseURL}/${pluginName}/config`, { configuration });
  }

  private getPluginStatus(plugin: any): 'enabled' | 'disabled' | 'not_installed' | 'error' {
    if (!plugin.isInstalled) {
      return 'not_installed';
    }
    if (plugin.isEnabled) {
      return 'enabled';
    }
    return 'disabled';
  }
}

export const pluginService = new PluginService();