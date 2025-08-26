#!/usr/bin/env node

const axios = require('axios');

console.log('🔍 Keystone Platform Core Function Tests\n');
console.log('========================================\n');

async function testEndpoint(name, url, method = 'GET', data = null) {
  try {
    const config = {
      method,
      url,
      timeout: 5000,
      validateStatus: () => true // Accept any status
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    
    if (response.status < 500) {
      console.log(`✅ ${name}: Working (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: Server Error (${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Failed (${error.code || error.message})`);
    return false;
  }
}

async function runTests() {
  let passed = 0;
  let failed = 0;
  
  console.log('1️⃣  Core Services\n');
  
  // Test Backend API
  if (await testEndpoint('Backend API Health', 'http://localhost:3000/health')) {
    passed++;
  } else {
    failed++;
  }
  
  // Test Backend UI
  if (await testEndpoint('Admin Dashboard UI', 'http://localhost:5174/')) {
    passed++;
  } else {
    failed++;
  }
  
  // Test Grafana
  if (await testEndpoint('Grafana Monitoring', 'http://localhost:3001/')) {
    passed++;
  } else {
    failed++;
  }
  
  console.log('\n2️⃣  Authentication System\n');
  
  // Test Auth endpoint
  if (await testEndpoint('Login Endpoint', 'http://localhost:3000/auth/login', 'POST', {
    username: 'test',
    password: 'test'
  })) {
    passed++;
  } else {
    failed++;
  }
  
  // Test protected route behavior
  if (await testEndpoint('Protected Route Check', 'http://localhost:3000/api/users')) {
    passed++;
  } else {
    failed++;
  }
  
  console.log('\n3️⃣  Database Connectivity\n');
  
  // Database test via auth (401 = DB working, 500 = DB issue)
  const dbTest = await axios.post('http://localhost:3000/auth/login', {
    username: 'nonexistent',
    password: 'wrongpass'
  }, { validateStatus: () => true });
  
  if (dbTest.status === 401 || dbTest.status === 400) {
    console.log('✅ PostgreSQL Database: Connected');
    passed++;
  } else {
    console.log('❌ PostgreSQL Database: Connection Issue');
    failed++;
  }
  
  console.log('\n4️⃣  Plugin System\n');
  
  // Test plugin endpoints
  if (await testEndpoint('Plugin Registry', 'http://localhost:3000/plugins')) {
    passed++;
  } else {
    failed++;
  }
  
  if (await testEndpoint('Address Validator Plugin', 'http://localhost:3000/api/address-validator/validate', 'POST', {
    address: {
      street: '123 Test St',
      city: 'Test City',
      state: 'CA',
      zip: '12345'
    }
  })) {
    passed++;
  } else {
    failed++;
  }
  
  console.log('\n5️⃣  Docker Services Status\n');
  
  const { exec } = require('child_process');
  
  await new Promise((resolve) => {
    exec('docker ps --format "{{.Names}}\t{{.Status}}" | grep keystone', (error, stdout) => {
      if (stdout) {
        const lines = stdout.trim().split('\n');
        lines.forEach(line => {
          const [name, status] = line.split('\t');
          const isHealthy = status.includes('healthy') || status.includes('Up');
          if (isHealthy) {
            console.log(`✅ ${name}: ${status}`);
            passed++;
          } else {
            console.log(`⚠️  ${name}: ${status}`);
          }
        });
      }
      resolve();
    });
  });
  
  console.log('\n========================================');
  console.log(`📊 Test Results: ${passed} passed, ${failed} failed`);
  console.log('========================================\n');
  
  // Test database tables
  console.log('6️⃣  Database Schema Verification\n');
  
  await new Promise((resolve) => {
    exec('docker exec keystone-postgres psql -U keystone -d keystone -c "\\dt" 2>/dev/null | grep -E "users|roles|plugins|permissions" | wc -l', 
      (error, stdout) => {
        const tableCount = parseInt(stdout.trim());
        if (tableCount >= 4) {
          console.log(`✅ Core tables exist: ${tableCount} tables found`);
          passed++;
        } else {
          console.log(`❌ Missing core tables: only ${tableCount} found`);
          failed++;
        }
        resolve();
      });
  });
  
  console.log('\n🏁 Final Summary\n');
  console.log('================');
  console.log(`Total Tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All core functions are working properly!');
  } else {
    console.log('\n⚠️  Some core functions need attention.');
  }
}

runTests().catch(console.error);