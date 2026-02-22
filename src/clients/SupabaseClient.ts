import { createClient } from '@supabase/supabase-js';
import { SUPABASE_API_KEY, SUPABASE_URL } from '../keys';

const SupabaseClient = createClient(SUPABASE_URL, SUPABASE_API_KEY);

export default SupabaseClient;
