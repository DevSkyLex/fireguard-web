import { type EnvironmentConfig } from '@core/config/environment';

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
  apiUrl: 'https://api.fireguard.valentin-fortin.pro',
  appName: 'Fireguard',
  mercureHubUrl: 'https://mercure.fireguard.valentin-fortin.pro/.well-known/mercure',
  maintenance: false,
};
