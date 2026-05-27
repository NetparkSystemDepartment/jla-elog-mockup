import axiosInstance from './axiosInstance';

/**
 * 1. ログインAPI
 * @param {Object} credentials - { login_type, user_id, pass }
 * @returns {Promise<Object>} - サーバーから返ってくるユーザー情報やトークン
 */
export const loginApi = async (credentials) => {
  // axiosInstanceのbaseURLが '/api' なので、実際は '/api/login' にリクエストが飛びます
  // ローカル開発中は、Viteのプロキシによって '.../api/v1/login' に自動転送されます
  const { data } = await axiosInstance.post('/login.php', credentials);
  return data;
};

/**
 * 2. データ登録API
 * @param {Object} recordData - 記録内容（入力値やunpatrolledフラグなど）
 * @returns {Promise<Object>} - 送信結果
 */
export const setinfoApi = async (recordData) => {
  const { data } = await axiosInstance.post('/setinfo.php', recordData);
  return data;
};

/**
 * 3, データ取得API
 * @param {Object} payload - { type: 1, key: 1 }
 * @returns {Promise<Object>}
 */
export const getinfoApi = async (payload) => {
  // ログインと同じ axiosInstance ＆ 同じスラッシュから始まるURLにするのが超重要です！
  const { data } = await axiosInstance.post('/getinfo.php', payload);
  return data;
};