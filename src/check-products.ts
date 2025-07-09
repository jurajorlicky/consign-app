import { supabase } from './lib/supabase';

const checkProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*');

  if (error) {
    console.error('Error:', error);
    return;
  }

  console.log('Products:', data);
};

checkProducts();