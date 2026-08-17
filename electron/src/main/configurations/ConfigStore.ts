import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import logger from '../../../utils/logger';

export class ConfigStore {
  private static instance: ConfigStore;
  private configPath: string;
  private config: { backendUrl?: string } = {};
  
  // Default URL if nothing is set
  private readonly DEFAULT_BACKEND_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

  private constructor() {
    this.configPath = path.join(app.getPath('userData'), 'app-config.json');
    this.loadConfig();
  }

  public static getInstance(): ConfigStore {
    if (!ConfigStore.instance) {
      ConfigStore.instance = new ConfigStore();
    }
    return ConfigStore.instance;
  }

  private loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(data);
      }
    } catch (e) {
      logger.error('Failed to load config file', e);
    }
  }

  private saveConfig() {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (e) {
      logger.error('Failed to save config file', e);
    }
  }

  public getBackendUrl(): string {
    return this.config.backendUrl || this.DEFAULT_BACKEND_URL;
  }

  public setBackendUrl(url: string) {
    this.config.backendUrl = url;
    this.saveConfig();
  }
}
