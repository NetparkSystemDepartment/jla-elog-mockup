import React, { createContext, useState, useContext, useEffect } from 'react';
// 開発用
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  // ブラウザ起動時に、保存されているログイン情報を復元する
  useEffect(() => {
    const savedUser = localStorage.getItem('elog_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  // ログイン関数
  const login = async (userData) => {
    
    console.log("Login Attempt:", userData);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userData.id)
      .single();

    //console.log("supabase:", data);
    
    if (data) {
      if((data.role !== 'admin') || (data.role === 'admin' && data.password === userData.password)) {
        // 成功
        setUser(data);
        return { success: true };
      } else {
        // 失敗
        return { success: false, message: 'パスワードが違います。' };
  }  
    } else {
      // 失敗
      return { success: false, message: 'ユーザーIDが違います。' };
    }
};

  // ログアウト関数
  const logout = () => {
    setUser(null);
    localStorage.removeItem('elog_user'); // 削除
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 簡単に呼び出すためのカスタムフック
export const useAuth = () => useContext(AuthContext);