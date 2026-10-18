import type { IntegrationManifest } from '../../types';
import { appAvailabilityCheck, monitoringAlertingCheck } from './checks';

export const vercelManifest: IntegrationManifest = {
  id: 'vercel',
  name: 'Vercel',
  description: 'Monitor deployments and alerting configuration in Vercel',
  category: 'Cloud',
  logoUrl: 'https://img.logo.dev/vercel.com?token=pk_AZatYxV5QDSfWpRDaBxzRQ&format=png&retina=true',
  docsUrl: 'https://vercel.com/docs/rest-api',
  isActive: true,

  // Nivela: token de equipo en vez de OAuth. Las Integrations privadas/no listadas de
  // Vercel dan 404 en vercel.com/integrations/{slug}/new, así que el flujo OAuth no sirve
  // para self-host. Un token con scope de equipo no necesita teamId en la API.
  auth: {
    type: 'api_key',
    config: { in: 'header', name: 'Authorization', prefix: 'Bearer ' },
  },
  credentialFields: [
    {
      id: 'api_key',
      label: 'Vercel Access Token',
      type: 'password',
      required: true,
      helpText:
        'Creá un token en vercel.com/account/settings/tokens con scope limitado al equipo (no Full Account).',
    },
  ],

  baseUrl: 'https://api.vercel.com',

  capabilities: ['checks'],

  services: [
    { id: 'monitoring', name: 'Monitoring & Alerting', description: 'Deployment monitoring and alerting configuration checks', enabledByDefault: true, implemented: true },
    { id: 'security', name: 'Security Settings', description: 'Project security headers and configuration audit', implemented: false },
  ],

  checks: [monitoringAlertingCheck, appAvailabilityCheck],
};
