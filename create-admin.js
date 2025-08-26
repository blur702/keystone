const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'keystone',
  user: 'keystone',
  password: 'keystone-dev-2024'
});

async function createAdmin() {
  try {
    // Hash the password
    const passwordHash = await bcrypt.hash('admin123', 10);
    let userId = uuidv4();
    
    // Create or update admin user
    const userResult = await pool.query(
      `INSERT INTO users (id, email, username, password_hash, first_name, last_name, is_active, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, true, NOW(), NOW())
       ON CONFLICT (email) 
       DO UPDATE SET 
         password_hash = EXCLUDED.password_hash,
         updated_at = NOW()
       RETURNING id`,
      [userId, 'admin@kevinalthaus.com', 'admin', passwordHash, 'Admin', 'User']
    );
    
    userId = userResult.rows[0].id;
    
    // Get or create admin role
    const roleResult = await pool.query(
      `INSERT INTO roles (id, name, description, created_at)
       VALUES ($1, 'admin', 'Administrator role', NOW())
       ON CONFLICT (name) DO UPDATE SET name = 'admin'
       RETURNING id`,
      [uuidv4()]
    );
    
    const roleId = roleResult.rows[0].id;
    
    // Assign admin role to user
    await pool.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role_id) DO NOTHING`,
      [userId, roleId]
    );
    
    console.log('Admin user created successfully!');
    console.log('Email: admin@kevinalthaus.com');
    console.log('Password: admin123');
    
    await pool.end();
  } catch (error) {
    console.error('Error creating admin user:', error);
    await pool.end();
    process.exit(1);
  }
}

createAdmin();