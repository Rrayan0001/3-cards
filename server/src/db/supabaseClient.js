const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase configuration missing:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
  console.error('   SUPABASE_KEY:', supabaseKey ? '✅ Set' : '❌ Missing');
  throw new Error('Supabase URL or Key is not set in environment variables.');
}

console.log('🔗 Initializing Supabase client...');
console.log('   URL:', supabaseUrl);
console.log('   Key type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role' : 'Anon');

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'X-Client-Info': '3cards-game'
    }
  }
});

// Test the connection
async function testConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    const { data, error } = await supabase
      .from('games')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
    
    console.log('✅ Supabase connection successful');
    return true;
  } catch (err) {
    console.error('❌ Supabase connection test error:', err.message);
    return false;
  }
}

// Test connection on startup
testConnection().then(success => {
  if (!success) {
    console.warn('⚠️  Supabase connection test failed, but continuing...');
  }
});

module.exports = supabase;


