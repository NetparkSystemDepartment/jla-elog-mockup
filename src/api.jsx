//import axios from 'axios';
// デバッグ用
import { supabase } from './supabaseClient';


//const api = axios.create({
//  baseURL: 'https://your-api-endpoint.com/api',
//});

// ログインAPI
export const login = async (credentials) => {
  // credentials = { login_type, user_id, pass }
  const { data } = await api.post('/login', credentials);
  return data; // APIが返すトークンやユーザー情報
};

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