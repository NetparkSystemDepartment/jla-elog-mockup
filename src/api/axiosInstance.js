import axios from 'axios';

const axiosInstance = axios.create({
  // 相対パスにすることで、開いている環境（プレリリース/本番）のドメインをブラウザが自動補完します
  baseURL: '/api', 
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

const SESSION_ERROR_CODES = [1002, 1004, 1005];

const forceLogout = () => {
  localStorage.removeItem('auth_data');
  localStorage.removeItem('briefing_data');
  localStorage.removeItem('weeklyBeachData');
  window.location.reload();
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