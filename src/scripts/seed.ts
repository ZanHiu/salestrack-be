import dotenv from 'dotenv';
dotenv.config();

import bcrypt from 'bcrypt';
import { connect, disconnect } from 'mongoose';
import { User } from '../models/User';
import { Product } from '../models/Product';

const PRODUCTS_DATA = [
  // 1. TOBA XANH
  { name: 'Toba Xanh', categoryName: '1. TOBA XANH', categoryOrder: 1, unit: 'chai' },
  // 2. HC
  { name: 'HC Booster', categoryName: '2. HC', categoryOrder: 2, unit: 'chai' },
  { name: 'HC King-Root', categoryName: '2. HC', categoryOrder: 2, unit: 'chai' },
  { name: 'Happy Farm', categoryName: '2. HC', categoryOrder: 2, unit: 'chai' },
  { name: 'WOW', categoryName: '2. HC', categoryOrder: 2, unit: 'chai' },
  // 3. SPRAY
  { name: 'Kelpit', categoryName: '3. SPRAY', categoryOrder: 3, unit: 'chai' },
  { name: 'Si-K', categoryName: '3. SPRAY', categoryOrder: 3, unit: 'chai' },
  { name: 'Spray Phos 620', categoryName: '3. SPRAY', categoryOrder: 3, unit: 'chai' },
  // 4. DƯỠNG RỄ
  { name: 'Chitosan', categoryName: '4. DƯỠNG RỄ', categoryOrder: 4, unit: 'chai' },
  { name: 'Đạm Cá', categoryName: '4. DƯỠNG RỄ', categoryOrder: 4, unit: 'chai' },
  { name: 'Đạm Tôm', categoryName: '4. DƯỠNG RỄ', categoryOrder: 4, unit: 'chai' },
  { name: 'Supermic', categoryName: '4. DƯỠNG RỄ', categoryOrder: 4, unit: 'chai' },
  { name: 'Cabo', categoryName: '4. DƯỠNG RỄ', categoryOrder: 4, unit: 'chai' },
  // 5. TRUYỀN THỐNG
  { name: 'F94', categoryName: '5. TRUYỀN THỐNG', categoryOrder: 5, unit: 'chai' },
  { name: 'F95', categoryName: '5. TRUYỀN THỐNG', categoryOrder: 5, unit: 'chai' },
  { name: 'Thioure', categoryName: '5. TRUYỀN THỐNG', categoryOrder: 5, unit: 'kg' },
  // 6. BVTV
  { name: 'Toba Jum', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Toba Net', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Abafax 1.8', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Abafax 3.6', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Azet', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Bacba', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Biorosamil', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Coc 86', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Hexa 5', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  { name: 'Tamala', categoryName: '6. BVTV', categoryOrder: 6, unit: 'chai' },
  // 7. KHÁC
  { name: 'Kẽm Vàng', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'kg' },
  { name: 'Khác 1', categoryName: '7. KHÁC', categoryOrder: 7 },
  { name: 'Reach', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'Rửa Rong Rêu', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'TB BO', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'TB Fruit', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'TB Phos', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'Toba Bám Dính', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'Vọt Hoa Nhãn', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
  { name: 'Vọt Hoa Xoài', categoryName: '7. KHÁC', categoryOrder: 7, unit: 'chai' },
];

async function seed(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined');
  }

  await connect(uri);
  console.log('✓ Connected to MongoDB');

  // 1. Tao admin user (idempotent)
  const adminUsername = process.env.DEFAULT_ADMIN_USERNAME;
  const adminPassword = process.env.DEFAULT_ADMIN_PASSWORD;
  const adminFullname = process.env.DEFAULT_ADMIN_FULLNAME;

  if (!adminUsername || !adminPassword || !adminFullname) {
    throw new Error('DEFAULT_ADMIN_* env vars are required');
  }

  const adminExists = await User.findOne({ username: adminUsername.toLowerCase() });
  if (!adminExists) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await User.create({
      username: adminUsername,
      passwordHash,
      fullName: adminFullname,
      role: 'admin',
    });
    console.log(`✓ Admin user created: ${adminUsername}`);
  } else {
    console.log(`- Admin user already exists: ${adminUsername}, skip`);
  }

  // 2. Seed products (idempotent via upsert)
  let inserted = 0;
  for (const p of PRODUCTS_DATA) {
    const result = await Product.findOneAndUpdate(
      { name: p.name },
      { $setOnInsert: p },
      { upsert: true, new: false },
    );
    if (!result) inserted += 1;
  }
  console.log(`✓ Seeded ${PRODUCTS_DATA.length} products (${inserted} newly inserted)`);

  await disconnect();
  console.log('Done');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
