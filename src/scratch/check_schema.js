import { supabase } from '../supabaseClient';

async function checkSchema() {
  const { data, error } = await supabase
    .from('leave_management')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}

checkSchema();
