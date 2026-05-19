import axios from 'axios';

const axiosInstance = axios.create({
  // 相対パスにすることで、開いている環境（プレリリース/本番）のドメインをブラウザが自動補完します
  baseURL: '/api', 
  
  // 5秒間サーバーから応答がない場合はタイムアウト（エラー）にする
  timeout: 5000, 
  
  headers: {
    'Content-Type': 'application/json',
  },
});

export default axiosInstance;