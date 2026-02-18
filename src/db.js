const DB_NAME = 'PatrolDB';
const STORE_NAME = 'records';

import Dexie from 'dexie';

// データベースの定義
export const db = new Dexie(DB_NAME);

db.version(1).stores({
  records: '++id, date'
});

// データの全取得
export const getAllRecords = async () => {
  return await db.records.toArray();
};

// データの保存（上書き対応）
export const saveRecord = async (record) => {
  // putは既存のキーがあれば更新、なければ追加（upsert）
  return await db.records.put(record);
};

// 特定の日付のデータだけを抽出
export const _getRecordsByDate = async (dateStr) => {
  return await db.records
    .where('date')
    .equals(dateStr)
    .toArray();
};

export const getRecordsByDate = async (dateStr) => {
  console.log("検索開始:", dateStr); // 渡ってきた値を確認

  const results = await db.records
    .where('date')
    .equals(dateStr)
    .toArray();

  console.log("検索結果:", results); // 結果が0件なら型か中身が違う
  return results;
};