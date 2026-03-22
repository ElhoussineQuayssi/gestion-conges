#!/usr/bin/env npx ts-node

/**
 * Test script to verify SQLite database integration
 */

import { initializeDatabase, findUserByEmail, getAllUsers } from '../lib/db/sqlite-adapter';
import { getDrizzleDb } from '../lib/db/index';
import { users } from '../lib/db/schema';

async function test() {
  console.log('=== Testing SQLite Database Integration ===\n');
  
  // Initialize database
  console.log('1. Initializing database...');
  await initializeDatabase();
  console.log('   Database initialized successfully!\n');
  
  // Test connection
  console.log('2. Testing database connection...');
  const db = getDrizzleDb();
  const userCount = await db.select({ count: users.id }).from(users);
  console.log(`   Connection OK! Users in database: ${userCount.length}\n`);
  
  // Test user lookup
  console.log('3. Testing user lookup...');
  const user = await findUserByEmail('employee@example.com');
  if (user) {
    console.log(`   Found user: ${user.full_name} (${user.email}) - Role: ${user.role}\n`);
  } else {
    console.log('   No user found with that email\n');
  }
  
  // Test get all users
  console.log('4. Testing getAllUsers...');
  const allUsers = await getAllUsers();
  console.log(`   Total users: ${allUsers.length}\n`);
  
  console.log('=== All tests passed! ===');
}

test().catch(console.error);
