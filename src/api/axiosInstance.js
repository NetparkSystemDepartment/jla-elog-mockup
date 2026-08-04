import axios from 'axios';

const axiosInstance = axios.create({
  // 相対パスにすることで、開いている環境（プレリリース/本番）のドメインをブラウザが自動補完します
  // d-elog.ripcurrent.orgの開発環境にアップする場合
  //baseURL: '/v2/', 
  //baseURL: '/v3/', 
  // それ以外
  baseURL: '/api/', 
  //baseURL: 'https://d-elog.ripcurrent.org/v1',
  
  // 5秒間サーバーから応答がない場合はタイムアウト（エラー）にする
  timeout: 5000, 
  
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  (config) => {
    const savedAuth = localStorage.getItem('auth_data');
    if (savedAuth) {
      try {
        const authData = JSON.parse(savedAuth);
        if (authData && authData.token) {
          config.headers['Authorization'] = `Bearer ${authData.token}`;
        }
      } catch (e) {
        console.error('トークン解析失敗', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 1001(ヘッダー情報なし)は、auth_dataが壊れていてトークンを付けられなかった場合などにも発生し、
// 1002/1004/1005と同様に再ログインが必要なため、セッションエラーとして扱う
export const SESSION_ERROR_CODES = [1001, 1002, 1004, 1005];

export const forceLogout = () => {
  localStorage.removeItem('auth_data');
  localStorage.removeItem('briefing_data');
  localStorage.removeItem('weeklyBeachData');
  // 呼び出し元（App.jsx/BriefingView.jsxなど）がエラーコードに応じたトーストを表示してから
  // logout()する設計のため、即リロードすると表示前に画面が消えてしまう。
  // トーストが目に入るよう少し待ってからリロードする
  setTimeout(() => window.location.reload(), 2000);
};

axiosInstance.interceptors.response.use(
  (response) => {
    if (SESSION_ERROR_CODES.includes(response.data?.error_no)) forceLogout();
    return response;
  },
  (error) => {
    if (SESSION_ERROR_CODES.includes(error.response?.data?.error_no)) forceLogout();
    return Promise.reject(error);
  }
);

export default axiosInstance;