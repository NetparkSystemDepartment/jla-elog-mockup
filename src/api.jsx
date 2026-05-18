import { supabase } from './supabaseClient';

// ユーザIDをすべて取得
export const fetchAllProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')

    if (error) {
      throw error
    }

    return data
  } catch (error) {
    console.error('Error fetching profiles:', error.message)
    return null
  }
}