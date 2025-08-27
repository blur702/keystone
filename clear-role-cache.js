const redis = require('redis');

async function clearRoleCache() {
  const client = redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
  });

  try {
    await client.connect();
    console.log('Connected to Redis');

    // Clear all role caches for kevin user
    const userId = '1cac7336-6fdb-4328-9f03-a278b46bb905';
    const cacheKey = `roles:${userId}`;
    
    const deleted = await client.del(cacheKey);
    console.log(`Deleted cache key "${cacheKey}":`, deleted ? 'Success' : 'Key not found');

    // Also clear any session caches
    const keys = await client.keys('session:*');
    console.log(`Found ${keys.length} session keys`);
    
    for (const key of keys) {
      await client.del(key);
      console.log(`Deleted session: ${key}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    // If Redis requires auth or isn't available, that's ok - cache will expire
    console.log('Note: Cache will expire naturally in 5 minutes');
  } finally {
    await client.quit();
  }
}

clearRoleCache().catch(console.error);