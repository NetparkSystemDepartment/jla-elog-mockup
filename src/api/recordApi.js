import axiosInstance, { SESSION_ERROR_CODES, forceLogout } from './axiosInstance';

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

// Content-Dispositionヘッダー（例: attachment; filename="loglist_20260701_20260720.csv"、
// もしくは RFC5987 の filename*=UTF-8''...）からファイル名を取り出す
const parseFilenameFromContentDisposition = (header) => {
  if (!header) return null;
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      // デコードに失敗した場合は下のASCII形式のパースにフォールスルー
    }
  }
  const asciiMatch = header.match(/filename="?([^";]+)"?/i);
  return asciiMatch ? asciiMatch[1] : null;
};

/**
 * 4. CSV出力API（選択されたレコードをサーバーでCSV化してもらう）
 * @param {Object} payload - { type: 4, data: [{ key: 'xxxx', detail_key: 'xxxx' }, ...] }
 *   ※ all_download_flg は「検索条件を無視した全件ダウンロード」用のフラグで、
 *   現仕様では必ず検索が入るためこのケースは使わない（付与しない）
 * @returns {Promise<{blob: Blob, filename: string|null}>} - CSVバイナリと、
 *   レスポンスヘッダーのContent-Dispositionから取得したファイル名
 *   （ファイル名はサーバー側で決定・設定される仕様のため、クライアントでは組み立てない）
 */
export const getCsvApi = async (payload) => {
  const response = await axiosInstance.post('/getinfo.php', payload, { responseType: 'blob' });
  const blob = response.data;

  // responseType: 'blob' はレスポンスインターセプターのerror_noチェックを素通りしてしまうため、
  // ここで個別にエラーレスポンス（JSON）かどうかを判定する
  if (blob.type && blob.type.includes('json')) {
    const json = JSON.parse(await blob.text());
    if (SESSION_ERROR_CODES.includes(json.error_no)) forceLogout();
    const err = new Error(json.error_msg || 'CSV出力に失敗しました');
    err.error_no = json.error_no;
    throw err;
  }

  const filename = parseFilenameFromContentDisposition(response.headers?.['content-disposition']);
  return { blob, filename };
};