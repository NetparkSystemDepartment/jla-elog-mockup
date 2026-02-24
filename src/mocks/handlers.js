import { http, HttpResponse } from 'msw';
import { saveRecord, getAllRecords, getRecordsByDate } from '../db.js';

export const handlers = [
  // 保存 (POSTリクエスト)
  
  http.post('/api/records', async ({ request }) => {
    const newRecord = await request.json();

    // Dexie関数を使用して保存
    const id = await saveRecord(newRecord);
    
    // 保存したデータとIDをレスポンスとして返す
    return HttpResponse.json({ ...newRecord, id }, { status: 201 });
  }),

//  // 日報の取得 (GETリクエスト / 全件 または 日付指定)
//  http.get('/api/records', async ({ request }) => {
//    const url = new URL(request.url);
//    const dateStr = url.searchParams.get('date');
//    console.log("② MSWが受け取った検索日付:", dateStr);
//
//    let data;
//    if (dateStr) {
//      // 日付検索
//      data = await getRecordsByDate(dateStr);
//    } else {
//      // 全件取得
//      data = await getAllRecords();
//    }
//    console.log("③ DBから取得した結果:", data); // ここが [] (空配列) なら検索条件が合致していません
//
//    return HttpResponse.json(data);
//  }),
//];

http.get('/api/records', async ({ request }) => {
  const url = new URL(request.url);
  const dateStr = url.searchParams.get('date');

  try {
    // 1. タイムアウト防止のため、確実に「値」が返るようにします。
    let data = [];
    
    if (dateStr) {
      // 検索。結果が null/undefined なら空配列にする
      const result = await getRecordsByDate(dateStr);
      data = result || [];
    } else {
      const result = await getAllRecords();
      data = result || [];
    }

    // 2. 空の状態でも、明確に「200 OK」として空配列を返却する
    console.log("MSW送信データ:", data);
    return HttpResponse.json(data);

  } catch (error) {
    console.error("MSW内のDB操作でエラー:", error);
    // 3. エラー時も「チャンネルを閉じず」にエラーレスポンスを返す
    return new HttpResponse(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}),
];