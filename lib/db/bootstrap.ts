import bcrypt from 'bcryptjs';
import { users, leaveBalances, offers } from './schema';
import { getDrizzleDb, saveDatabase as persistDatabase } from './index';
import { runMigration } from './migrate';

export async function ensureDatabaseSeeded(): Promise<{ initialized: boolean; seededNow: boolean }> {
  await runMigration();

  const db = await getDrizzleDb();
  const existingUsers = await db.select({ id: users.id }).from(users).limit(1);

  if (existingUsers.length > 0) {
    return { initialized: true, seededNow: false };
  }

  const currentYear = new Date().getFullYear();
  const createdAt = new Date().toISOString();

  await db.insert(users).values([
    {
      id: 1,
      email: 'employee@example.com',
      password_hash: bcrypt.hashSync('Employee123!', 10),
      full_name: 'Jean Employe',
      role: 'employee',
      department: 'Ventes',
      status: 'active',
      created_at: createdAt,
    },
    {
      id: 2,
      email: 'admin@example.com',
      password_hash: bcrypt.hashSync('Admin123!', 10),
      full_name: 'Marie Admin',
      role: 'hr_admin',
      department: 'RH',
      status: 'active',
      created_at: createdAt,
    },
    {
      id: 3,
      email: 'owner@example.com',
      password_hash: bcrypt.hashSync('Owner123!', 10),
      full_name: 'Pierre Owner',
      role: 'owner',
      department: 'Direction',
      status: 'active',
      created_at: createdAt,
    },
  ]);

  await db.insert(leaveBalances).values([
    {
      id: 1,
      user_id: 1,
      annual_leave: 30,
      used_leave: 5,
      remaining_leave: 25,
      year: currentYear,
      days_worked: 0,
      calculated_leave: 0,
      manual_adjustment: 0,
      updated_at: createdAt,
      created_at: createdAt,
    },
    {
      id: 2,
      user_id: 2,
      annual_leave: 30,
      used_leave: 0,
      remaining_leave: 30,
      year: currentYear,
      days_worked: 0,
      calculated_leave: 0,
      manual_adjustment: 0,
      updated_at: createdAt,
      created_at: createdAt,
    },
    {
      id: 3,
      user_id: 3,
      annual_leave: 30,
      used_leave: 0,
      remaining_leave: 30,
      year: currentYear,
      days_worked: 0,
      calculated_leave: 0,
      manual_adjustment: 0,
      updated_at: createdAt,
      created_at: createdAt,
    },
  ]);

  await db.insert(offers).values([
    {
      id: 1,
      title: 'Sejour a Marrakech',
      description: 'Decouvrez la ville rouge et ses souks authentiques',
      destination: 'Marrakech, Maroc',
      start_date: `${currentYear}-06-15`,
      end_date: `${currentYear}-06-22`,
      duration: '7 jours / 6 nuits',
      price: 1500,
      max_participants: 20,
      current_participants: 5,
      application_deadline: `${currentYear}-06-01`,
      hotel_name: 'Hotel Marrakech Palace',
      conditions: 'Reservation non remboursable',
      images: [],
      status: 'Disponible',
      created_by: 2,
      created_at: createdAt,
    },
    {
      id: 2,
      title: 'Plage a Essaouira',
      description: "Relaxation au bord de l'Ocean Atlantique",
      destination: 'Essaouira, Maroc',
      start_date: `${currentYear}-07-01`,
      end_date: `${currentYear}-07-08`,
      duration: '7 jours / 6 nuits',
      price: 1200,
      max_participants: 30,
      current_participants: 12,
      application_deadline: `${currentYear}-06-15`,
      hotel_name: 'Hotel Atlas Essaouira',
      conditions: 'Petit-dejeuner inclus',
      images: [],
      status: 'Disponible',
      created_by: 2,
      created_at: createdAt,
    },
    {
      id: 3,
      title: 'Trek dans le Sahara',
      description: 'Aventure inoubliable dans le desert du Sahara',
      destination: 'Merzouga, Maroc',
      start_date: `${currentYear}-08-10`,
      end_date: `${currentYear}-08-17`,
      duration: '7 jours / 6 nuits',
      price: 1800,
      max_participants: 15,
      current_participants: 7,
      application_deadline: `${currentYear}-07-25`,
      hotel_name: 'Auberge Sahara Dreams',
      conditions: 'Guide professionnel inclus',
      images: [],
      status: 'Disponible',
      created_by: 2,
      created_at: createdAt,
    },
  ]);

  await persistDatabase();

  return { initialized: true, seededNow: true };
}
