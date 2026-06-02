// 未送信（isSynced が 1）のデータを取得（ServiceWorker用）

import Dexie from 'dexie';

const DB_NAME = 'e-log_p1_r03';

const db = new Dexie(DB_NAME);
db.version(3).stores({
  records: '[date+beach+seq], isSynced',
});

export const getUnsentRecordsFromIndexedDB = async () => {

try {
    const unsyncedRecord = await db.records
      .where('isSynced')
      .equals(1)
      .toArray();

    if (unsyncedRecord.length === 0) {
      console.log("未送信データ検索結果: 0件");
      return [];
    }

    return unsyncedRecord;

  } catch (error) {
    console.error("getUnsentRecordsFromIndexedDB 内部での処理エラー:", error);
    return [];
  }
};

export const saveRecordToIndexedDB = async (record) => {
  try {
    await db.records.put(record);
  } catch (error) {
    console.error("saveRecordToIndexedDB エラー:", error);
    throw error;
  }
};