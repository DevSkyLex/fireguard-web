import { type EnvironmentConfig } from '@core/config/environment/environment-config.interface';

/**
 * Environment production
 * @type {EnvironmentConfig}
 *
 * @description
 * This is the environment configuration for production.
 * It is used to configure the application for production.
 *
 * @author Valentin FORTIN <contact@valentin-fortin.pro>
 */
export const environment: EnvironmentConfig = {
  production: true,
  apiUrl: 'http://localhost:8000',
  appName: 'Fireguard',
  mercureHubUrl: 'http://localhost:3000/.well-known/mercure',
};
