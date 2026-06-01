// sw.js (ServiceWorkerのコード)
//import { getUnsentRecordsFromIndexedDB } from './db';
importScripts('db-config.js');


self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-beach-reports') {
    // 処理が終わるまでServiceWorkerを終了させない
    event.waitUntil(syncUnsentReports());
  }
});

async function syncUnsentReports() {
  // 1. IndexedDBから isSynced === 1 の未送信レコードを全件取得する
  // (※ getUnsentRecordsFromServer などの取得関数を別途定義しておく)
  const unsentRecords = await getUnsentRecordsFromIndexedDB(); 

  for (const record of unsentRecords) {
    try {
      // 2. 送信用データの整形 (画面側でやっていた cleanRecord と同じ処理)
      const { date, id, timestamp, isSynced, ...cleanRecord } = record;
      const payload = {
        type: 1,
        data: {
          ...cleanRecord,
          delete_flg: false,
        }
      };

      // 3. サーバーへ送信
      // ※ ServiceWorker内では axios ではなく通常の fetch API を使うのが一般的です
      const response = await fetch('/api/your-endpoint', { // 実際のURLに合わせて変更
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // 必要に応じて認証ヘッダーなどもここに入れる
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('サーバーエラー');
      }

      // 4. 送信成功したら、IndexedDB の該当データを「送信済み(isSynced: 2)」に更新
      await saveRecordToIndexedDB({
        ...record,
        isSynced: 2 // 送信完了
      });

      console.log(`レコードID: ${record.id} の同期に成功しました`);

    } catch (error) {
      console.error('バックグラウンド同期中にエラーが発生:', error);
      // ここでエラーを throw すると、ブラウザが「同期失敗」と判断し、
      // あとで電波状況が良いときに再度この sync イベントをリトライしてくれます。
      throw error; 
    }
  }
}