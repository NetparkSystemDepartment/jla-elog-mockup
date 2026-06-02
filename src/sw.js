// sw.js (ServiceWorkerのコード)
import { getUnsentRecordsFromIndexedDB, saveRecordToIndexedDB } from './db-config.js';

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-beach-reports') {
    event.waitUntil(syncUnsentReports());
  }
});

async function syncUnsentReports() {
  const unsentRecords = await getUnsentRecordsFromIndexedDB();
  let hasError = false;

//console.log('unsentRecords:', unsentRecords);  
  for (const record of unsentRecords) {
//console.log('record:', record);  
    try {
      const { date, id, timestamp, isSynced, token, ...cleanRecord } = record;
      const embededToken = record.token;
      const payload = {
        type: 1,
        data: {
          ...cleanRecord,
          delete_flg: false,
        }
      };

//console.log('embededToken:', embededToken);  
      const response = await fetch('https://d-elog.ripcurrent.org/v1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json',
          'Authorization': `Bearer ${embededToken}`
         },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error('サーバーエラー');

      await saveRecordToIndexedDB({ ...record, isSynced: 2 });
      console.log(`レコードID: ${record.id} の同期に成功しました`);

    } catch (error) {
      console.error('バックグラウンド同期中にエラーが発生:', error);
      hasError = true; // 1件失敗しても残りを続ける
    }
  }

  if (hasError) throw new Error('一部のレコードで同期失敗'); // ブラウザに再試行を促す
}