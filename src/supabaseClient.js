// src/supabaseClient.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ufzxynxzsjyrboznpcld.supabase.co'
const supabaseKey = 'sb_publishable_GpJV59BAD9pcgu_T427cPw_xgCUF3Kv'

export const supabase = createClient(supabaseUrl, supabaseKey)