// indexedDB

const DB_NAME = 'e-log_p1_02';
const STORE_NAME = 'records';

import Dexie from 'dexie';

// データベースの定義
export const db = new Dexie(DB_NAME);

db.version(2).stores({
  records: '[date+beach+seq]'
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

export const __getRecordsByDate = async (dateStr) => {
  console.log("検索開始:", dateStr); // 渡ってきた値を確認

  const results = await db.records
    .where('date')
    .equals(dateStr)
    .toArray();

  console.log("検索結果:", results); // 結果が0件なら型か中身が違う
  return results;
};

export const getRecordsByDate = async (dateStr) => {
  console.log("検索開始（全ビーチ分）:", dateStr);

  // 1. 指定された日付のデータをすべて取得（全ビーチ、全seqが混ざった状態）
  const allResults = await db.records
    .where('date')
    .equals(dateStr)
    .toArray();

  if (allResults.length === 0) {
    console.log("検索結果: 0件");
    return [];
  }

  // 2. ビーチごとに「seqが最大のデータ」だけを抽出する
  const latestRecordsMap = {};

  allResults.forEach((record) => {
    const currentBeach = record.beach; // ビーチのIDなど

    // まだこのビーチのデータが登録されていない、
    // または、すでにあるデータよりも今回のデータのほうが seq が大きい場合、上書きする
    if (!latestRecordsMap[currentBeach] || record.seq > latestRecordsMap[currentBeach].seq) {
      latestRecordsMap[currentBeach] = record;
    }
  });

  // 3. 連想配列（Map）の値を、通常の配列に戻して返す
  const finalResults = Object.values(latestRecordsMap);

  console.log("各ビーチの最新レコード一覧:", finalResults);
  return finalResults; // 配列が返ります
};

// 指定された日付のレコードを1件取得する
export const checkRecordByDate = async (date, beach) => {
  return await db.records.get([date, beach]);
};