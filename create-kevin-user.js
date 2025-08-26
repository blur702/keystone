const { Client } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function createKevinUser() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'keystone',
    user: process.env.DB_USER || 'keystone',
    password: process.env.DB_PASSWORD || 'keystone-dev-2024'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if user already exists
    const checkResult = await client.query(
      'SELECT id FROM users WHERE email = $1 OR username = $1',
      ['kevin']
    );

    if (checkResult.rows.length > 0) {
      console.log('User kevin already exists, updating password...');
      
      // Hash the password
      const hashedPassword = await bcrypt.hash('(130Bpm)', 10);
      
      // Update existing user
      await client.query(
        `UPDATE users 
         SET password_hash = $1, 
             is_active = true, 
             is_verified = true,
             updated_at = CURRENT_TIMESTAMP
         WHERE email = $2 OR username = $2`,
        [hashedPassword, 'kevin']
      );
      
      console.log('Password updated for user kevin');
    } else {
      // Create new user
      const userId = uuidv4();
      const hashedPassword = await bcrypt.hash('(130Bpm)', 10);
      
      await client.query(
        `INSERT INTO users (
          id, email, username, password_hash, 
          first_name, last_name, is_active, is_verified,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [
          userId,
          'kevin@kevinalthaus.com',
          'kevin',
          hashedPassword,
          'Kevin',
          'Althaus',
          true,
          true
        ]
      );
      
      console.log('Created user kevin with email kevin@kevinalthaus.com');
      
      // Check if admin role exists
      const roleResult = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        ['admin']
      );
      
      if (roleResult.rows.length > 0) {
        // Assign admin role
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [userId, roleResult.rows[0].id]
        );
        console.log('Assigned admin role to kevin');
      }
    }
    
    console.log('✅ User kevin is ready to log in with password: (130Bpm)');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

createKevinUser();