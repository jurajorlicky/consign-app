import { supabase } from './lib/supabase';

async function checkConnection() {
  console.log('Checking Supabase connection...');
  console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
  
  try {
    // Jednoduchá kontrola pripojenia
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error accessing products table:', error);
      throw error;
    }

    console.log('Connection successful!');
    console.log('Sample data:', data);

  } catch (err) {
    console.error('Connection test failed:', err);
  }
}

checkConnection();