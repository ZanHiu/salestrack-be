import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import { connect, disconnect } from 'mongoose';
import { User } from '../models/User';
import { importFromBuffer } from '../services/bulkImport.service';

async function main(): Promise<void> {
  const filePath = process.argv[2];
  const year = Number(process.argv[3]);

  if (!filePath || !Number.isInteger(year)) {
    console.error('Usage: npm run migrate-excel -- <path-to-xlsx> <year>');
    process.exit(1);
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI not set');

  await connect(uri);
  console.log('✓ Connected to MongoDB');

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    throw new Error('Khong tim thay admin user. Chay `npm run seed` truoc.');
  }

  const buffer = readFileSync(filePath);
  console.log(`Reading ${filePath}, size=${buffer.length} bytes`);

  const result = await importFromBuffer(buffer, year, admin._id.toString(), {
    autoCreateCustomers: true,
  });

  console.log('--- Import summary ---');
  console.log(`Imported: ${result.imported}`);
  console.log(`Failed:   ${result.failed}`);
  if (result.errors.length > 0) {
    console.log('First 10 errors:');
    result.errors.slice(0, 10).forEach((e) => {
      console.log(`  Row ${e.row}: ${e.reason}`);
    });
  }

  await disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
