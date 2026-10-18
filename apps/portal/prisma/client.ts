import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import tls from 'node:tls';

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function stripSslMode(connectionString: string): string {
  const url = new URL(connectionString);
  url.searchParams.delete('sslmode');
  return url.toString();
}

function isLocalhostUrl(connectionString: string): boolean {
  try {
    const { hostname } = new URL(connectionString);
    const stripped = hostname.replace(/^\[/, '').replace(/\]$/, '');
    return LOCAL_HOSTNAMES.has(stripped);
  } catch {
    return false;
  }
}

// Nivela: CA extra (PEM) para bases fuera de AWS, p.ej. Supabase Root 2021 CA.
// Se suma al trust store por defecto y mantiene la verificación completa (cadena + hostname).
function extraCaSsl(): { ca: string[] } | undefined {
  const pem = process.env.DATABASE_CA_CERT?.replace(/\\n/g, '\n').trim();
  return pem ? { ca: [...tls.rootCertificates, pem] } : undefined;
}

function createPrismaClient(): PrismaClient {
  const rawUrl = process.env.DATABASE_URL!;
  const isLocalhost = isLocalhostUrl(rawUrl);
  const allowInsecure = process.env.PRISMA_ALLOW_INSECURE_TLS === '1';

  // See apps/app/prisma/client.ts for the rationale on dropping `ssl.ca`
  // (replaces rather than augments the trust store; broke RDS Proxy
  // chain validation).
  const ssl:
    | undefined
    | { ca: string[] }
    | { checkServerIdentity: () => undefined }
    | { rejectUnauthorized: false } =
    isLocalhost
      ? undefined
      : extraCaSsl()
        ? extraCaSsl()
        : allowInsecure
        ? { rejectUnauthorized: false }
        : { checkServerIdentity: () => undefined };

  const url = ssl !== undefined ? stripSslMode(rawUrl) : rawUrl;
  const adapter = new PrismaPg({ connectionString: url, ssl });
  return new PrismaClient({
    adapter,
    transactionOptions: {
      timeout: 60000,
    },
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }
  return globalForPrisma.prisma;
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, _receiver) {
    const client = getClient();
    const value = Reflect.get(client, prop, client);
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
