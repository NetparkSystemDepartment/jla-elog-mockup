// indexedDB

const DB_NAME = 'e-log_p1_r03';
const STORE_NAME = 'records';

import Dexie from 'dexie';

// データベースの定義
export const db = new Dexie(DB_NAME);

//db.version(2).stores({
//  records: '[date+beach+seq]'
//});

db.version(3).stores({
  records: '[date+beach+seq], isSynced'
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
//export const checkRecordByDate = async (date, beach) => {
//  return await db.records.get([date, beach]);
//};

export const hasUnsyncedRecords = async () => {
  try {
    // 全データから、isSynced が false のものを1件だけ探す　→　2以外に変更
    const unsyncedRecord = await db.records
      .filter(record => record.isSynced !== 2) 
      .limit(1)
      .toArray();

    // 配列の長さが 1 以上（＝見つかった）なら true、空なら false
    return unsyncedRecord.length > 0;
  } catch (error) {
    console.error("hasUnsyncedRecords 内部での処理エラー:", error);
    return false; // エラー時は安全のため false を返してログアウトを止めないようにする
  }
};

// データの削除
export const deleteRecords = async () => {
  return await db.records.clear();
};

// 未送信（isSynced が 1）のデータを取得（ServiceWorker用）
export const getUnsentRecordsFromIndexedDB = async () => {
  try {
    // 全データから、isSynced が 1 のものを取得
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

