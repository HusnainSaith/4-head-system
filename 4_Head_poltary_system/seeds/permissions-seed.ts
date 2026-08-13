import 'reflect-metadata';
import { AppDataSource } from '../src/config/data-source';

// NOTE: Permissions seeding is not applicable in SRS simplified structure
// Permissions are now role-based through the User.role enum field

export async function seedPermissions() {
  try {
    console.log('⏭️  Permissions seeding skipped (using simplified SRS role structure)');
  } catch (e) {
    console.error('Permissions seed error:', e);
    throw e;
  }
}

