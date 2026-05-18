import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

    const [state, setState] = useState({
    data: {
        id: "staff01",
        role: "patrol",
    },
    error: null
    });

  // ログイン関数
  const login = async (userData) => {
    
    console.log("(dummy) Login Attempt:", userData);
    
    const { data, error } = state;
    data.id = userData.id;
    console.log("(dummy) data:", data);

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
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// 簡単に呼び出すためのカスタムフック
export const useAuth = () => useContext(AuthContext);