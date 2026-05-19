import axiosInstance from './axiosInstance';

/**
 * 1. ログインAPI
 * @param {Object} credentials - { login_type, user_id, pass }
 * @returns {Promise<Object>} - サーバーから返ってくるユーザー情報やトークン
 */
export const loginApi = async (credentials) => {
  // axiosInstanceのbaseURLが '/api' なので、実際は '/api/login' にリクエストが飛びます
  // ローカル開発中は、Viteのプロキシによって '.../api/v1/login' に自動転送されます
  const { data } = await axiosInstance.post('/login', credentials);
  return data;
};

/**
 * 2. パトロール記録送信API
 * @param {Object} recordData - 記録内容（入力値やunpatrolledフラグなど）
 * @returns {Promise<Object>} - 送信結果
 */
export const submitRecordApi = async (recordData) => {
  const { data } = await axiosInstance.post('/records', recordData);
  return data;
};