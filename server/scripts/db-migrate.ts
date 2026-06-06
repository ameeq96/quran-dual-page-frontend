import 'dotenv/config';
import 'reflect-metadata';
import { AppDataSource } from '../db.js';

async function main() {
  await AppDataSource.initialize();
  await AppDataSource.synchronize();
  await AppDataSource.destroy();
  console.log('Database tables synchronized successfully.');
}

main().catch(async (error: unknown) => {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  console.error('Database migration failed.');
  console.error(error);
  process.exit(1);
});
