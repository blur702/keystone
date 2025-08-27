const { Client } = require('pg');

async function updateKevinToAdmin() {
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

    // First get the user ID
    const userResult = await client.query(
      `SELECT id FROM users WHERE username = 'kevin' OR email = 'kevin@kevinalthaus.com'`
    );

    if (userResult.rows.length === 0) {
      console.log('User not found');
      return;
    }

    const userId = userResult.rows[0].id;
    console.log('Found user:', userId);

    // Get admin and super_admin role IDs
    const rolesResult = await client.query(
      `SELECT id, name FROM roles WHERE name IN ('admin', 'super_admin', 'user')`
    );

    console.log('Available roles:', rolesResult.rows);

    // Insert user_roles entries for admin and super_admin
    for (const role of rolesResult.rows) {
      if (role.name === 'admin' || role.name === 'super_admin') {
        await client.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [userId, role.id]
        );
        console.log(`Added role ${role.name} to user`);
      }
    }

    // Verify roles were added
    const verifyResult = await client.query(
      `SELECT r.name FROM roles r 
       JOIN user_roles ur ON r.id = ur.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );

    console.log('User now has roles:', verifyResult.rows.map(r => r.name));

  } catch (error) {
    console.error('Error updating user:', error);
  } finally {
    await client.end();
  }
}

updateKevinToAdmin();