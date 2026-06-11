import { getinfoApi } from './api/recordApi';

export const loadWeeklyRecords = async () => {

  const requestBody = {
    type: 1,
  //  key: 62,
  };

  const resData = await getinfoApi(requestBody);

  if (resData && Array.isArray(resData.data)) {

    // 基準となる「7日前」の日付文字列（YYYY-MM-DD形式）を作成
    const d = new Date();
    d.setDate(d.getDate() - 6); // 今日を含めて7日間（6日前まで）
  
    // '2026-05-21' のようなフォーマットに変換
    const sevenDaysAgoStr = d.toISOString().split('T')[0]; 

    // 7日前より新しい（＝直近1週間分の）データだけにフィルターをかける
    const weeklyFilteredData = resData.data.filter(item => {
    // 文字列同士の比較（ex. '2026-05-28' >= '2026-05-22'）
      return item.startDate >= sevenDaysAgoStr;
    });

    // 必要な項目だけを抽出する
    const weeklyData = weeklyFilteredData.map(item => ({
      startDate: item.startDate,
      detail_key: item.detail_key,
      beach: item.beach
    }));

    try {
      // ローカルストレージに保存
      localStorage.setItem('weeklyBeachData', JSON.stringify(weeklyData));
//console.log('weeklyBeachDataを保存しました');      
    } catch (error) {
      console.error('ローカルストレージへの保存に失敗しました:', error);
    }

  } else {
    console.warn('resData.data が取得できませんでした。');
  }
}

// // ログインAPI
// export const login = async (credentials) => {
//   // credentials = { login_type, user_id, pass }
//   const { data } = await api.post('/login', credentials);
//   return data; // APIが返すトークンやユーザー情報
// };

// // ユーザIDをすべて取得
// export const fetchAllProfiles = async () => {
//   try {
//     const { data, error } = await supabase
//       .from('profiles')
//       .select('*')

//     if (error) {
//       throw error
//     }

//     return data
//   } catch (error) {
//     console.error('Error fetching profiles:', error.message)
//     return null
//   }
// }