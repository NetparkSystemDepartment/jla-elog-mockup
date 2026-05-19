import React, { createContext, useState, useContext, useEffect } from 'react';

//import React, { createContext, useContext, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginApi } from '../api/recordApi'; // 先ほど作ったAxiosの関数

// 開発用
import { supabase } from '../supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  
  // ユーザーのログイン状態やトークンを管理するステート（必要に応じて）
  const [user, setUser] = useState(null);

  // TanStack QueryのuseMutationを定義
  const loginMutation = useMutation({
    mutationFn: loginApi,
  });

  // ブラウザ起動時に、保存されているログイン情報を復元する
  useEffect(() => {
    const savedUser = localStorage.getItem('elog_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

//  // ログイン関数
//  const login = async (userData) => {
//    
//    console.log("Login Attempt:", userData);
//    
//    const { data, error } = await supabase
//      .from('profiles')
//      .select('*')
//      .eq('id', userData.id)
//      .single();
//
//    //console.log("supabase:", data);
//    
//    if (data) {
//      if((data.role !== 'admin') || (data.role === 'admin' && data.password === userData.password)) {
//        // 成功
//        setUser(data);
//        return { success: true };
//      } else {
//        // 失敗
//        return { success: false, message: 'パスワードが違います。' };
//  }  
//    } else {
//      // 失敗
//      return { success: false, message: 'ユーザーIDが違います。' };
//    }
//};

  /**
   * LoginViewから呼ばれるログイン関数
   * @param {Object} credentials - { id, password }
   */
  const login = async (credentials) => {
    try {
      // 1. APIに送るリクエスト用データを組み立て
      // パスワードの有無（またはLoginViewのisAdmin状態など）でlogin_typeを判定して付与
      const payload = {
        login_type: credentials.password ? 'admin' : 'staff', 
        user_id: credentials.id,
        pass: credentials.password, // パスワードがなければ null または空文字
      };

      // 2. 非同期でAxiosのPOSTリクエストを実行（結果を待つ）
      const data = await loginMutation.mutateAsync(payload);

      // 3. 成功時の処理：トークンの保存など
      if (data && data.token) {
        localStorage.setItem('token', data.token);
        setUser(data.user || { id: credentials.id }); // ユーザー情報を保持
      }

      // LoginView.jsx が期待する形式（{ success: true }）で返す
      return { success: true };

    } catch (error) {
      // 4. エラー時の処理：サーバーからのエラーメッセージを取得
      console.error('Login Error:', error);
      
      const errorMessage = 
        error.response?.data?.message || 
        'ログインに失敗しました。ユーザーIDまたはパスワードを確認してください。';
      
      // LoginView.jsx が期待する形式（{ success: false, message: ... }）で返す
      return { success: false, message: errorMessage };
    }
  };

//  // ログアウト関数
//  const logout = () => {
//    setUser(null);
//    localStorage.removeItem('elog_user'); // 削除
//  };

  /**
   * ログアウト関数（前にお話ししたコンファーム画面から呼ばれる想定）
   */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    queryClient.clear(); // TanStack Queryのキャッシュを全削除
//    window.location.href = '/login';
  };

//  return (
//    <AuthContext.Provider value={{ user, login, logout }}>
//      {children}
//    </AuthContext.Provider>
//  );

  return (
    <AuthContext.Provider 
      value={{ 
        login, 
        logout,
        user,
        // 送信中フラグ（isPending）も共有して、LoginViewで連打防止できるようにする
        isPending: loginMutation.isPending 
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

// 画面側で使うためのカスタムフック
export const useAuth = () => useContext(AuthContext);
