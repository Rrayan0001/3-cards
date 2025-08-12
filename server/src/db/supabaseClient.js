const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !serviceKey) {
  // eslint-disable-next-line no-console
  console.warn('Supabase credentials are not set. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY).');
}

const supabase = createClient(supabaseUrl || 'http://localhost', serviceKey || '');

module.exports = { supabase };


