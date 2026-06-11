import axios from 'axios';

const axiosInstance = axios.create({
  // 相対パスにすることで、開いている環境（プレリリース/本番）のドメインをブラウザが自動補完します
  //baseURL: '/v2/', 
  baseURL: '/api/', 
  //baseURL: 'https://d-elog.ripcurrent.org/v1',
  
  // 5秒間サーバーから応答がない場合はタイムアウト（エラー）にする
  timeout: 5000, 
  
  headers: {
    'Content-Type': 'application/json',
  },
});

// リクエスト・インターセプター
axiosInstance.interceptors.request.use(
  (config) => {
    // ローカルストレージからログイン結果を丸ごと取得
    const savedAuth = localStorage.getItem('auth_data');
//console.log('リクエスト・インターセプト:', savedAuth);
    
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        
        // authDataの "token" を取得
        if (authData && authData.token) {
          // ヘッダーに自動添付 (Bearer形式)
          config.headers['Authorization'] = `Bearer ${authData.token}`;
        }
      } catch (e) {
        console.error('トークン解析失敗', e);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;