import React, { useState, useEffect } from 'react';
import ListView from './views/ListView';
import EditView from './views/EditView';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import BriefingView from './views/BriefingView';
import RecordsListView from './views/RecordsListView';
import { getAllRecords, saveRecord, getRecordsByDate } from './db';
import { startOfDay, format } from 'date-fns';
import { toast, Toaster } from 'sonner';
import { useAuth } from './contexts/authContext';
import { supabase } from './supabaseClient';
import { loadWeeklyRecords } from './api';
import { setinfoApi } from './api/recordApi';

import { ONNA_BEACHES } from './constantsPublic';

const DUMMYSTAFF = [ 'staff01', 'staff02', 'staff03', 'staff04', 'staff05' ];

function App() {
  const { user, login, logout, isLoading  } = useAuth(); // Contextから取得
  const [loginId, setLoginId] = useState('');
  const [view, setView] = useState('briefing'); // デフォルトをhomeに
  
  // --- ブリーフィングで設定する共有データ ---
  const [briefingData, setBriefingData] = useState({
    weather: '',
    windSpeed: '',
    tide: '',
    current: '',
    wave: '',
    temp: '',
    waterTemp: ''
  });

  useEffect(() => {
    if (!user) {
      // ログアウト（userがnull）されたらステートをリセット
      setBriefingData({
        weather: '',
        windSpeed: '',
        tide: '',
        current: '',
        wave: '',
        temp: '',
        waterTemp: ''
      });
      // 必要に応じて localStorage もクリア
//      localStorage.removeItem('briefing_data');
      setView('briefing');
    }
  }, [user]);

  const [selectedCoast, setSelectedCoast] = useState('');
  const [selectedBeach, setSelectedBeach] = useState('');
  const today = startOfDay(new Date());
  const [baseDate, setBaseDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [savedRecords, setSavedRecords] = useState([]);
  const [recentHandovers, setRecentHandovers] = useState([]);
  const [profileList, setProfileList] = useState([]);
  const [syncedRecords, setSyncedRecords] = useState([]);

  // idからビーチ名を返す
  const getNameByBeachId = (name) => ONNA_BEACHES.find((c) => c.id === name)?.name;

  useEffect(() => {
    if (user && view === 'list') loadRecords();
  }, [selectedDate, user, view]);

  // データ読み込み処理（indexedDB）
  const loadRecords = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const result = await getRecordsByDate(dateStr);
//console.log('result:', result);

    // resultが存在する場合のみマッピング処理を行う
    // 基本的に当日以外はデータはないはず
    const formattedRecords = (result || []).map((record) => {
      return {
        ...record, // 元のデータをそのままコピー
//        startDate: record.startDate,
        beach: getNameByBeachId(record.beach) // beach部分だけ名前（文字列）に置き換え
      };
    });

//console.log('formattedRecords:', formattedRecords);
    setSavedRecords(formattedRecords || []);
//console.log('formattedRecords:', formattedRecords);

  // サーバー登録済データ
    let localWeeklyData = [];
    const weeklyString = localStorage.getItem('weeklyBeachData');
//console.log('weeklyString:', weeklyString);

    if (weeklyString) {
      try {
        const allWeeklyData = JSON.parse(weeklyString);
 
        const stringifiedItems = allWeeklyData.map(item => JSON.stringify(item));

        const uniqueStrings = [...new Set(stringifiedItems)];

        const WeeklyData = uniqueStrings.map(item => JSON.parse(item));
//console.log('WeeklyData:', WeeklyData);
    
        if (Array.isArray(WeeklyData)) {
          localWeeklyData = WeeklyData.filter(item => item.startDate === dateStr);
        }
      } catch (error) {
        console.error('ローカルストレージのデータ解析に失敗:', error);
      }
    }

//console.log('localWeeklyData:', localWeeklyData);
    setSyncedRecords(localWeeklyData || []);

//console.log('syncedRecords:', syncedRecords);




  };

  // 保存処理（子から呼ばれる）
  // ローカル保存（indexedDB）
  const handleSave = async (formData) => {
    const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
    const beachName = selectedBeach;
  
  // 送信用に、先頭にuser_idを挿入した新しいオブジェクトを作成
    const updatedFormData = {
      ...formData,
      members: [user.id, ...formData.members]
    };

    const record = { 
      ...updatedFormData, 
//      beach: beachName, 
      date: formattedDate, 
//      isSynced: false, // サーバー未送信フラグ
      isSynced: 0, // サーバー未送信フラグ
//      timestamp: Date.now() 
      token: user.token,
    };
console.log('record', record);
    try {
        const id = await saveRecord(record);
      
        console.log('保存成功（ID）:', id);
        toast.success('保存しました！');
      
      } catch (error) {
        console.error('保存失敗:', error);
        toast.error('保存に失敗しました');
      }
  
      try {
        await loadRecords();
        setView('list');
      } catch (error) {
          console.error('読み込み失敗:', error);
          toast.error('データの読み込みに失敗しました');
      }
    };
  
  // 送信処理（子コンポーネントの EditView から呼ばれる）
  // サーバーへ送信
  const handleSubmit = async (formData) => {
    const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
//console.log('formattedDate:', formattedDate);

    const beachName = selectedBeach;

    // 送信用に、先頭にuser_idを挿入した新しいオブジェクトを作成
    const updatedFormData = {
      ...formData,
      members: [user.id, ...formData.members]
    };

    // 1. まずは「未送信状態(isSynced: false)」としてオブジェクトを作成
    const record = { 
      ...updatedFormData, 
      date: formattedDate, 
//      isSynced: false, // サーバー未送信フラグ
      isSynced: 1, // サーバー未送信フラグ
      token: user.token,
    };

    let localId;

    // 2. データの安全を最優先し、まずは確実に IndexedDB へ保存する
    try {
      localId = await saveRecord(record);
      console.log('ローカルへの一次保存成功（ID）:', localId);
    } catch (error) {
      console.error('ローカル保存失敗:', error);
      toast.error('ローカルへの保存に失敗したため、送信を中断しました');
      return; // ローカル保存に失敗した場合は安全のためここで処理を止める
    }

    // 3. サーバーへの登録（recordApi.js の関数を呼び出し）を試みる
    try {
      // ユーザーに通信中であることを伝えるために Loading トーストを表示
      const toastId = toast.loading('サーバーに送信中...');

      // axiosInstance が共通でヘッダー（Authorizationなど）を処理する設計、
      // またはサーバー側がセッション/POST内のデータで認証する設計であれば、そのまま record を渡します。
 
      const { date, id, timestamp, isSynced, 
        ...cleanRecord } = record;

//console.log('cleanRecord:', cleanRecord);

      const payload = {
        type: 1,
        data: {
          ...cleanRecord,
          delete_flg: false,
        }
      };

//console.log('payload:', payload);
      // recordApi.js のデータ登録APIを実行
      const result = await setinfoApi(payload);
      console.log('サーバー登録成功:', result);

      // 4. 送信が成功したら、IndexedDB の該当データを「送信済み(isSynced: true)」に上書き更新
      await saveRecord({
        ...record,
        id: localId,    // saveRecordが同一IDを認識できるように指定
//        isSynced: true, // 送信完了フラグを真にする
        isSynced: 2, // 送信完了フラグを真にする
      });

      // 1週間分のデータを取り込み直す
      // promiseを待ちます
      await loadWeeklyRecords();

      // トーストを成功表示に切り替える
      toast.success('サーバーへ送信・登録しました！', { id: toastId });

    } catch (error) {
      console.error('サーバー送信失敗:', error);

      // Background Sync を登録する
      if ('serviceWorker' in navigator && 'sync' in window) {
        try {
          const registration = await navigator.serviceWorker.ready;
          // 'sync-beach-reports' などのタグ名で同期タスクを登録
          await registration.sync.register('sync-beach-reports');
          console.log('Background Syncに同期タスクを登録しました');
        } catch (syncError) {
          console.error('Sync登録失敗:', syncError);
        }
      }

      // サーバーへの送信が失敗しても、IndexedDBには isSynced: 1 で残っている
      toast.error('通信エラーのためサーバー送信に失敗しました。電波からの復帰時に自動同期されます。');
    }

    // 5. 最後に共通処理として、一覧データを再読み込みして画面をリストに戻す
    try {
      await loadRecords();
      setView('list');
    } catch (error) {
      console.error('読み込み失敗:', error);
      toast.error('データの再読み込みに失敗しました');
    }
  };

  // ログイン時のコールバック
//  const handleLogin = async (userInfo) => {
//
//    // 管理者の場合もブリーフィング画面へ
//    if (userInfo.role === 'admin') {
//      setView('briefing');
//    } else {
//      setView('briefing');
//    }
//  };

  // 
  const handleSelectBeach = (beachName) => {
    const targetBeaches = ['裏真栄田ビーチ', 'アボガマ', '希望ヶ丘ビーチ'];
    if (targetBeaches.includes(beachName)) {
      setSelectedBeach(beachName);
      setView('edit');
    }
  };

  // 開始
  const handleBriefingComplete = (data) => {
//    if (data.handoverMemo === null || data.handoverMemo ==="") {
//      data.handoverMemo = "なし";
//    }
//    if (data.noteMemo === null || data.noteMemo ==="") {
//      data.noteMemo = "なし";
//    }
    const mappedData = {
      // EditView.jsx の initialFormData のキーに合わせる
      tide: data.tide,
      highTideTime: data.highTideTime,
      highTide: data.highTide,
      lowTideTime: data.lowTideTime,
      lowTide: data.lowTide,
      windDir: data.windDir,
      windSpeed: data.windSpeed,
      warn: data.warn,
      alert: data.alert,
      handover: data.handoverMemo,
      note: data.noteMemo,
      members: data.members,
      carType: data.carType,
      carNo: data.carNo,
      //visitors: 0,
      //jpWarning: 0,
      //forWarning: 0,
      //jpTourist: 0,
      //forTourist: 0,
      unpatrolled: false,
      seq: 1,
    };

    // ローカルストレージに保存（ログイン認証が有効ならばブリーフィング画面に復元する）
    localStorage.setItem('briefing_data', JSON.stringify(data));

    if (mappedData.handover === null || mappedData.handover ==="") {
      mappedData.handover = "なし";
    }
    if (mappedData.note === null || mappedData.note ==="") {
      mappedData.note = "なし";
    }

    setBriefingData(mappedData);
 
    setView('home');
  };

  // --- 画面分岐 ---
  const renderView = () => {
  
//console.log('renderView:', user);

    // 起動直後、localStorage からの読み込みが完了するまでは待機する
    if (isLoading) {
      return null;
    }
//console.log('renderView2:', user);
//console.log('view:', view);

    if (!user || !user.id) {
      return <LoginView />;
    }

  // 画面分岐
    switch (view) {
    case 'home':
      return <HomeView user={user} onNavigate={(target) => setView(target)} />;

    case 'briefing':
      return (
        <BriefingView
          user={user} 
          onComplete={handleBriefingComplete} 
          recentHandovers={recentHandovers}
          profileList={profileList}
        />
      );

    case 'list':
//console.log('syncedRecords:', syncedRecords);
      return (
        <>
         <ListView 
          user={user} 
          baseDate={baseDate} setBaseDate={setBaseDate}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          savedRecords={savedRecords}
          syncedRecords={syncedRecords}
          onSelectBeach={handleSelectBeach}
          onSelectCoast={(coast) => setSelectedCoast(coast)}
          onNavigate={(target) => setView(target)}
        />
        </>
      );
    
    case 'records': // 記録一覧への遷移
      return (
        <RecordsListView 
         savedRecords={savedRecords} 
         onBack={() => setView('home')} 
        />
      );

    case 'edit':
 // console.log('selectedDate:', selectedDate);
//console.log('savedRecords:', savedRecords);
       return (
        <EditView
          user={user}
          selectedCoast={selectedCoast} 
          selectedBeach={selectedBeach}
          selectedDate={format(selectedDate, 'yyyy-MM-dd')}
//          selectedDate={selectedDate} 
          onSave={handleSave}
          onSubmit={handleSubmit}
          onBack={() => setView('list')}
          // --- 重要: 既存データがない場合、ブリーフィングデータを初期値として渡す ---
//         existingData={savedRecords.find(r => r.beach === selectedBeach) || briefingData}
          existingData={(() => {
            // 選択したビーチのデータを取得
            const foundRecord = savedRecords.find(r => r.beach === selectedBeach);

            // データがある場合、そのデータは送信済みか
            // 未送信ならそのデータを返す
//            if (foundRecord && !foundRecord.isSynced) {
            if (foundRecord && foundRecord.isSynced === 0) {
              return foundRecord;
            }

            // データがない、または送信済みの場合
            // 新規データ扱いにする
            // データがあればそのseqに+1、なければ1にする
            const nextSeq = foundRecord ? (Number(foundRecord.seq) || 0) + 1 : 1;

            return {
              ...briefingData,
                seq: nextSeq,
                unpatrolled: false,      // undefined対策
                id: undefined,           // IndexedDBで別レコードとして新規保存させるため、IDをクリアする
//                isSynced: false          // 新しいレコードなので未送信にする
                isSynced: 0          // 新しいレコードなので未送信にする
            };
          })()}
          profileList={profileList}
          seq={1}
        />
      );

    default:
      return <HomeView onNavigate={(target) => setView(target)} />;
  }};

  return (
    <div>
      <Toaster richColors position="top-center" />
      {renderView()}
    </div>
  );

}

const styles = {
  appcontainer: { width: '100%', maxWidth: '820px', margin: '0 auto', minheight: '100dvh' },
  headerStyle: { backgroundColor: '#44445A', width: '100%', position: 'sticky', top: '0', zIndex: '100' },
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto' },
  fullScreenCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', backgroundColor: '#f0f4f8' },
  form: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '300px' },
  briefingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '15px', backgroundColor: '#0a9396', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  statusBar: { padding: '10px', textAlign: 'right', fontSize: '12px', color: '#666' },
  logoutBtn: { border: 'none', background: 'none', textDecoration: 'underline' }
};

export default App;