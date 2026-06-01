// 未送信（isSynced が 1）のデータを取得（ServiceWorker用）
const getUnsentRecordsFromIndexedDB = async () => {
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
