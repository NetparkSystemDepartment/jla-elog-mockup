const DB_NAME = 'PatrolDB';
const STORE_NAME = 'records';

import Dexie from 'dexie';

// データベースの定義
export const db = new Dexie(DB_NAME);

db.version(1).stores({
  records: '++id'
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