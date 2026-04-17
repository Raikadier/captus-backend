import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

let cachedClient = null;

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

export const getSupabaseClient = () => {
  if (cachedClient) {
    return cachedClient;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }

  cachedClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
};

export const requireSupabaseClient = () => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return client;
};
