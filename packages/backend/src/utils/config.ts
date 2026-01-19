/**
 * Configuration management for the backend.
 */

/**
 * Application settings loaded from environment variables.
 */
export interface Settings {
  // Server settings
  host: string;
  port: number;
  debug: boolean;

  // OpenCode Server configuration
  opencodeServerUrl: string;

  // Temporary file storage
  tempDir: string;

  // Limits
  maxUploadSizeMb: number;
  executionTimeoutSeconds: number;

  // CORS settings
  corsOrigins: string[];

  // Computed properties
  maxUploadSizeBytes: number;
}

/**
 * Get value from environment variable or default.
 */
function getEnv(key: string, defaultValue: string): string {
  return process.env[key] ?? defaultValue;
}

/**
 * Get numeric value from environment variable or default.
 */
function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get boolean value from environment variable or default.
 */
function getEnvBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Get array value from environment variable or default.
 */
function getEnvArray(key: string, defaultValue: string[]): string[] {
  const value = process.env[key];
  if (value === undefined) {
    return defaultValue;
  }
  return value.split(',').map((s) => s.trim()).filter(Boolean);
}

let cachedSettings: Settings | null = null;

/**
 * Load settings from environment variables.
 */
function loadSettings(): Settings {
  const maxUploadSizeMb = getEnvNumber('MAX_UPLOAD_SIZE_MB', 10);

  return {
    // Server settings
    host: getEnv('HOST', '0.0.0.0'),
    port: getEnvNumber('PORT', 3001),
    debug: getEnvBoolean('DEBUG', false),

    // OpenCode Server configuration
    opencodeServerUrl: getEnv('OPENCODE_SERVER_URL', 'http://127.0.0.1:4097'),

    // Temporary file storage
    tempDir: getEnv('TEMP_DIR', '/tmp/claude-skills-runtime'),

    // Limits
    maxUploadSizeMb,
    executionTimeoutSeconds: getEnvNumber('EXECUTION_TIMEOUT_SECONDS', 300),

    // CORS settings
    corsOrigins: getEnvArray('CORS_ORIGINS', [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
    ]),

    // Computed properties
    maxUploadSizeBytes: maxUploadSizeMb * 1024 * 1024,
  };
}

/**
 * Get cached settings instance.
 */
export function getSettings(): Settings {
  if (!cachedSettings) {
    cachedSettings = loadSettings();
  }
  return cachedSettings;
}

/**
 * Reset cached settings (useful for testing).
 */
export function resetSettings(): void {
  cachedSettings = null;
}
