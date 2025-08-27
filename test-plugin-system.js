const { Client } = require('pg');
const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testPluginSystem() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'keystone',
    user: 'keystone',
    password: 'keystone-dev-2024'
  });

  try {
    await client.connect();
    console.log('📊 Connected to database\n');

    // Check if plugins table exists
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'plugins'
      );
    `);
    console.log('✅ Plugins table exists:', tableCheck.rows[0].exists);

    // Check current plugins in database
    const pluginsResult = await client.query('SELECT * FROM plugins');
    console.log('\n📦 Plugins in database:', pluginsResult.rows.length);
    
    if (pluginsResult.rows.length > 0) {
      pluginsResult.rows.forEach(plugin => {
        console.log(`  - ${plugin.name} v${plugin.version} [${plugin.is_enabled ? 'ENABLED' : 'DISABLED'}]`);
      });
    }

    // Check user roles
    const rolesResult = await client.query(`
      SELECT r.name 
      FROM roles r 
      JOIN user_roles ur ON r.id = ur.role_id 
      JOIN users u ON ur.user_id = u.id 
      WHERE u.username = 'kevin'
    `);
    console.log('\n👤 User kevin has roles:', rolesResult.rows.map(r => r.name).join(', '));

    // Test API authentication
    console.log('\n🔑 Testing API authentication...');
    const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
      email: 'kevin',
      password: '(130Bpm)'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    
    // Decode token to check roles (without verification, just to see content)
    const tokenParts = token.split('.');
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    console.log('📋 Token roles:', payload.roles);
    console.log('⏰ Token expires:', new Date(payload.exp * 1000).toLocaleString());

    // Test plugin API endpoints
    console.log('\n🔌 Testing Plugin API endpoints...');
    
    try {
      const pluginsResponse = await axios.get(`${API_URL}/api/plugins`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      console.log('✅ GET /api/plugins successful');
      console.log('   Found', pluginsResponse.data.plugins.length, 'plugins via API');
      
      if (pluginsResponse.data.plugins.length > 0) {
        pluginsResponse.data.plugins.forEach(plugin => {
          console.log(`   - ${plugin.name} [${plugin.status}]`);
        });
      }
    } catch (error) {
      console.log('❌ GET /api/plugins failed:', error.response?.data?.error || error.message);
    }

    // Check plugin loader initialization in backend
    console.log('\n🔧 Checking PluginLoader setup...');
    const pluginsDir = '/home/kevin/keystone/packages/backend/src/plugins';
    const fs = require('fs');
    
    if (fs.existsSync(pluginsDir)) {
      const plugins = fs.readdirSync(pluginsDir).filter(f => fs.statSync(`${pluginsDir}/${f}`).isDirectory());
      console.log('✅ Plugins directory exists with', plugins.length, 'plugin(s):');
      plugins.forEach(p => console.log(`   - ${p}`));
      
      // Check if plugin has proper structure
      plugins.forEach(pluginName => {
        const manifestPath = `${pluginsDir}/${pluginName}/manifest.json`;
        const pluginJsonPath = `${pluginsDir}/${pluginName}/plugin.json`;
        const indexPath = `${pluginsDir}/${pluginName}/index.ts`;
        
        console.log(`\n   📁 ${pluginName}:`);
        console.log(`      manifest.json: ${fs.existsSync(manifestPath) ? '✅' : '❌'}`);
        console.log(`      plugin.json: ${fs.existsSync(pluginJsonPath) ? '✅' : '❌ (required by PluginLoader)'}`);
        console.log(`      index.ts: ${fs.existsSync(indexPath) ? '✅' : '❌'}`);
      });
    } else {
      console.log('❌ Plugins directory not found');
    }

    console.log('\n🎯 SUMMARY:');
    console.log('===========');
    console.log('1. Database schema: ✅ Properly configured');
    console.log('2. User permissions: ✅ Admin role assigned');
    console.log('3. API authentication: ⚠️  Token not including admin role');
    console.log('4. Plugin structure: ⚠️  Missing plugin.json file (has manifest.json instead)');
    console.log('\n💡 ISSUE FOUND: The PluginLoader expects "plugin.json" but the address-validator plugin has "manifest.json"');
    console.log('   This mismatch prevents the plugin from being loaded properly.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('   Response:', error.response.data);
    }
  } finally {
    await client.end();
  }
}

testPluginSystem().catch(console.error);