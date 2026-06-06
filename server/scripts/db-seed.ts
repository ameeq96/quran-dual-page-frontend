import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../db.js';
import { seedDefaults } from '../seed/seed-admin.js';

async function main() {
  await AppDataSource.initialize();
  await seedDefaults(AppDataSource);
  await AppDataSource.destroy();
  console.log('Database seeded successfully.');
}

main().catch(async (error: unknown) => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  console.error('Database seed failed.');
  console.error(error);
  process.exit(1);
});
