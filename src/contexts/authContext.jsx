import React, { createContext, useState, useContext, useEffect } from 'react';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { loginApi } from '../api/recordApi'; // Axios関数

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  
  // ユーザーのログイン状態やトークンを管理するステート
  const [user, setUser] = useState(null);
  // ローカルストレージから読み込み中状態を管理するステート
  const [isLoading, setIsLoading] = useState(true);

  const [members, setMembers] = useState([]);
  const [carInfo, setCarInfo] = useState([]);

  // TanStack QueryのuseMutationを定義
  const loginMutation = useMutation({
    mutationFn: loginApi,
  });

  // ブラウザ起動時に、保存されているログイン情報を復元する
  useEffect(() => {

    const savedAuthData = localStorage.getItem('auth_data');

    if (savedAuthData) {
      try {
        // 文字列から元のオブジェクト（JSON）に復元
        const authData = JSON.parse(savedAuthData);
//console.log('authData:', authData);
        
        // 復元したデータからユーザー情報をStateに書き戻す
        if (authData && authData.id) {
          setUser({
            id: authData.id,
            kind: authData.kind,
            area: authData.area
          });

          setMembers(authData.members || []);
          setCarInfo(authData.carInfo || []);
        }         
        // ※必要であれば、Axiosの共通ヘッダーにトークンを仕込む処理もここで
        // axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${authData.token}`;

        } catch (error) {
          // 万が一データが破損していたらお掃除
          localStorage.removeItem('auth_data');
          setUser(null);
          setCarInfo([]);
      }
    } else {
      // localStorage に何もなければログインしていないので null
      setUser(null);
    }
    setIsLoading(false); // 復元完了後に false にする
  }, []);

  /**
   * LoginViewから呼ばれるログイン関数
   * @param {Object} credentials - { id, password }
   */
  const login = async (credentials) => {
    try {
      // 1. APIに送るリクエスト用データを組み立て
      // パスワードの有無でlogin_typeを判定して付与
      const payload = {
        login_type: credentials.password ? '1' : '0', 
        user_id: credentials.id,
        pass: credentials.password, // パスワードがなければ null または空文字
      };

      // 2. 非同期でAxiosのPOSTリクエストを実行（結果を待つ）
      const data = await loginMutation.mutateAsync(payload);

//console.log('data;', data);
      // 3. 成功時の処理：トークンの保存など
      if (data && data.result) {
        const authData = {
          ...data,
          id: credentials.id,
        };
//console.log('authData:', authData);
        // レスポンス全体（data）を文字列に変換して丸ごと保存
//        localStorage.setItem('auth_data', JSON.stringify(data));
        localStorage.setItem('auth_data', JSON.stringify(authData));
        // ユーザー情報を保持
        setUser({
          id: credentials.id,
          kind: data.kind,
          area: data.area
        });

        setMembers(data.members || []);
        setCarInfo(data.carInfo || []);
// console.log('carInfo;', carInfo);

        //// LoginView.jsx が期待する形式（{ success: true }）で返す
        //return { success: true };
        return { 
          success: true, 
          user: user, 
          carInfo: data.carInfo || [] 
        };
      }
      else {
        return { success: false, message: data.error_msg };
      }

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

  /**
   * ログアウト関数
   */
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('auth_data');
    localStorage.removeItem('briefing_data');
    localStorage.removeItem('weeklyBeachData');
    setUser(null);
    setCarInfo([]);
    // queryClient.clear(); // TanStack Queryのキャッシュを全削除
  };

  return (
    <AuthContext.Provider 
      value={{ 
        login, 
        logout,
        user,
        // 送信中フラグ（isPending）も共有して、LoginViewで連打防止できるようにする
        isPending: loginMutation.isPending ,
        isLoading
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

// 画面側で使うためのカスタムフック
export const useAuth = () => useContext(AuthContext);
