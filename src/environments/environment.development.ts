import { type EnvironmentConfig } from '@core/config/environment';

/**
 * Environment development
 * @type {EnvironmentConfig}
 *
 * @description
 * This is the environment configuration for development.
 * It is used to configure the application for development.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const environment: EnvironmentConfig = {
  production: false,
  apiUrl: 'http://localhost:8000',
  appName: 'Fireguard',
  mercureHubUrl: 'http://localhost:3000/.well-known/mercure',
  maintenance: true,
};
