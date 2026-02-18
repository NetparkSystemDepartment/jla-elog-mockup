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

  // 日報の取得 (GETリクエスト / 全件 または 日付指定)
  http.get('/api/records', async ({ request }) => {
    const url = new URL(request.url);
    const dateStr = url.searchParams.get('date');

    let data;
    if (dateStr) {
      // 日付検索
      data = await getRecordsByDate(dateStr);
    } else {
      // 全件取得
      data = await getAllRecords();
    }

    return HttpResponse.json(data);
  }),
];