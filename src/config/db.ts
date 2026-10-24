import dns from 'node:dns';
import mongoose from 'mongoose';

function configureMongoDns(): void {
  const configuredServers = process.env.MONGODB_DNS_SERVERS
    ?.split(',')
    .map((server) => server.trim())
    .filter(Boolean);

  const servers =
    configuredServers && configuredServers.length > 0
      ? configuredServers
      : process.env.NODE_ENV === 'development'
        ? ['8.8.8.8', '1.1.1.1']
        : [];

  if (servers.length > 0) {
    dns.setServers(servers);
  }
}

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  try {
    configureMongoDns();
    await mongoose.connect(uri);
    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err);
    process.exit(1);
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err);
  });
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
