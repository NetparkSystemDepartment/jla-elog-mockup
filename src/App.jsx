import React, { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ListView from './views/ListView';
import EditView from './views/EditView';
import LogEntryView from './views/LogEntryView';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import BriefingView from './views/BriefingView';
import RecordsListView from './views/RecordsListView';
import RecordDetailView from './views/RecordDetailView';
import { getAllRecords, saveRecord, getRecordsByDate, cleanupExpiredData } from './db';
import { startOfDay, format, subDays } from 'date-fns';
import { toast, Toaster } from 'sonner';
import { useAuth } from './contexts/authContext';
import { supabase } from './supabaseClient';
import { loadWeeklyRecords } from './api';
import { setinfoApi } from './api/recordApi';
import { Home, LifeBuoy, PencilLine, FileText, Megaphone } from 'lucide-react';
import { getNameByBeachNo } from './useAreaInfo';
import { useNetworkState } from 'react-use';

import { COAST_DATA, ONNA_BEACHES } from './constantsPublic';

const DUMMYSTAFF = [ 'staff01', 'staff02', 'staff03', 'staff04', 'staff05' ];

const FOOTER_VIEWS = ['home', 'list', 'records'];

function GlobalFooter({ onNavigate }) {
  // ログデータ画面はオフライン時に使えない導線のため、オフライン中はボタンを無効化する
  const netState = useNetworkState();
  const recordsDisabled = !netState.online;

  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200 }}>
      <nav style={gfStyles.footer}>
        <button onClick={() => onNavigate('home')} style={gfStyles.navItem}>
          <Home size={24} /><span>ホーム</span>
        </button>
        <button style={gfStyles.navItem}>
          <LifeBuoy size={24} /><span>救助登録</span>
        </button>
        <button onClick={() => onNavigate('list')} style={gfStyles.navItem}>
          <div style={gfStyles.mainCircle}>
            <PencilLine size={24} />
            <span style={{ fontSize: '10px', marginTop: '2px' }}>新規登録</span>
          </div>
        </button>
        <button
          onClick={() => onNavigate('records')}
          disabled={recordsDisabled}
          style={{ ...gfStyles.navItem, ...(recordsDisabled ? gfStyles.navItemDisabled : {}) }}
        >
          <FileText size={24} /><span>ログデータ</span>
        </button>
        <button style={gfStyles.navItem}>
          <Megaphone size={24} /><span>お知らせ</span>
        </button>
      </nav>
    </div>
  );
}

const gfStyles = {
  footer: {
    backgroundColor: '#08172A', height: '80px',
    display: 'flex', justifyContent: 'space-around', alignItems: 'center',
    color: 'white', maxWidth: '820px', margin: '0 auto',
    borderRadius: '20px 20px 0 0',
  },
  navItem: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: '4px', background: 'none', border: 'none', color: 'white',
    fontSize: '10px', cursor: 'pointer',
  },
  navItemDisabled: { opacity: 0.4, cursor: 'not-allowed' },
  mainCircle: {
    width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#08172A',
    border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column',
  },
};

function App() {
  const { user, login, logout, isLoading  } = useAuth();
  const queryClient = useQueryClient();
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
    const cleanupIndexedDB = async () => {
      try {
        // アプリ起動時にバックグラウンドで古いデータを掃除
        await cleanupExpiredData();
      } catch (error) {
        console.error('indexedDB削除エラー:', error);
      }
    };

    cleanupIndexedDB();
  }, []);

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
  const [targetRecords, setTargetRecords] = useState(null);
  const [recentHandovers, setRecentHandovers] = useState([]);
  const [profileList, setProfileList] = useState([]);
  const [syncedRecords, setSyncedRecords] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  // ログ詳細画面(recordDetail)の遷移元。戻るボタンの遷移先と、
  // 編集・取消ボタンの表示可否（ブリーフィング経由では非表示）の判定に使う
  const [recordDetailSource, setRecordDetailSource] = useState('records');
  const [editingRecord, setEditingRecord] = useState(null);
  const [recordsCsvSelectedKeys, setRecordsCsvSelectedKeys] = useState(new Set());

  // ログデータ一覧の検索条件。ログ詳細画面との行き来（records ⇄ recordDetail）では保持し、
  // フッターの「ログデータ」メニューから入り直した時だけ resetRecordsFilters() で初期化する
  const recordsInitialDateFrom = () => format(subDays(new Date(), 3), 'yyyy-MM-dd');
  const recordsInitialDateTo   = () => format(new Date(), 'yyyy-MM-dd');
  const recordsInitialMembers  = () => (user?.user_id ? [user.user_id] : []);

  const [recordsFilterAreas, setRecordsFilterAreas]       = useState([]);
  const [recordsFilterDateFrom, setRecordsFilterDateFrom] = useState(recordsInitialDateFrom);
  const [recordsFilterDateTo, setRecordsFilterDateTo]     = useState(recordsInitialDateTo);
  const [recordsFilterDow, setRecordsFilterDow]           = useState('');
  const [recordsFilterMembers, setRecordsFilterMembers]   = useState(recordsInitialMembers);
  const [recordsDraftAreas, setRecordsDraftAreas]         = useState([]);
  const [recordsDraftDateFrom, setRecordsDraftDateFrom]   = useState(recordsInitialDateFrom);
  const [recordsDraftDateTo, setRecordsDraftDateTo]       = useState(recordsInitialDateTo);
  const [recordsDraftDow, setRecordsDraftDow]             = useState('');
  const [recordsDraftMembers, setRecordsDraftMembers]     = useState(recordsInitialMembers);
  const [recordsSortCol, setRecordsSortCol]               = useState(null);
  const [recordsSortDir, setRecordsSortDir]               = useState('desc');
  const [recordsCurrentPage, setRecordsCurrentPage]       = useState(1);
  const [recordsShowCancelled, setRecordsShowCancelled]   = useState(false);

  const resetRecordsFilters = () => {
    setRecordsFilterAreas([]);
    setRecordsFilterDateFrom(recordsInitialDateFrom());
    setRecordsFilterDateTo(recordsInitialDateTo());
    setRecordsFilterDow('');
    setRecordsFilterMembers(recordsInitialMembers());
    setRecordsDraftAreas([]);
    setRecordsDraftDateFrom(recordsInitialDateFrom());
    setRecordsDraftDateTo(recordsInitialDateTo());
    setRecordsDraftDow('');
    setRecordsDraftMembers(recordsInitialMembers());
    setRecordsSortCol(null);
    setRecordsSortDir('desc');
    setRecordsCurrentPage(1);
    setRecordsShowCancelled(false);
    setRecordsCsvSelectedKeys(new Set());
  };

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
        beach: getNameByBeachNo(record.area, record.beach) // beach部分だけ名前（文字列）に置き換え
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
//console.log('formData', formData);
    const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
    const beachName = selectedBeach;
  
  // 送信用に、先頭にuser_idを挿入した新しいオブジェクトを作成
  // 2026.6.5 user_idは挿入しない 
    const updatedFormData = {
      ...formData,
//      members: [user.id, ...formData.members]
    };

    // 6/E版 user_idを別に持つ
    const record = { 
      ...updatedFormData, 
//      beach: beachName, 
      date: formattedDate, 
//      isSynced: false, // サーバー未送信フラグ
      isSynced: 0, // サーバー未送信フラグ
//      timestamp: Date.now() 
//      token: user.token,
      loginId: user.id,
};
//console.log('record', record);
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
//      members: [user.id, ...formData.members]
    };

    // 1. まずは「未送信状態(isSynced: false)」としてオブジェクトを作成
    const record = { 
      ...updatedFormData, 
      date: formattedDate, 
//      isSynced: false, // サーバー未送信フラグ
      isSynced: 1, // サーバー未送信フラグ
      token: user.token,
      loginId: user.id,
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
 
      // area/beach は EditView の handleSendClick で既に selectedCoast.no / selectedBeach.no
      // （マスタのエリア番号）がセット済みのため、ここでは破棄・再計算せずそのまま使う。
      // 以前はここで getMasterAreaBeachNos(selectedCoast, selectedBeach) により再計算していたが、
      // selectedCoast/selectedBeach は { no, name } オブジェクトなのに文字列として比較しており、
      // 常に area: null / beach: null になって「パラメータ異常(3001)」でサーバーに拒否されていた
      const { date, id, timestamp, isSynced,
        ...cleanRecord } = record;

      // membersは自分以外のパトロールメンバーのみを送る。記録担当者はgetinfoのlogin_user
      // フィールドでサーバー側が別途保持しており、setinfo(type=1)の仕様にlogin_userは無いため
      // クライアントからmembersにログイン者自身を混ぜて送ってはいけない
      const payload = {
        type: 1,
        data: {
          ...cleanRecord,
          members: cleanRecord.members || [],
          delete_flg: false,
        }
      };

//console.log('payload:', payload);
      // recordApi.js のデータ登録APIを実行
      const result = await setinfoApi(payload);

      // トークンの有効期限切れ、再ログイン
      if (result.result === false) {
        toast.dismiss(toastId);
        if (result.error_no === 1001) {
          toast.warning(
            <div>ログイン情報が確認できません。<br />再ログインして再度送信してください。</div>
          );
          logout();
          return;
        }
        if (result.error_no === 1002) {
          toast.warning(
            <div>ログイン情報が不正です。<br />再ログインして再度送信してください。</div>
          );
          logout();
          return;
        }
        if (result.error_no === 1004) {
          toast.warning(
            <div>ログインの有効期限が切れました。<br />再ログインして再度送信してください。</div>
          );  
          logout();
          return;
        }
        if (result.error_no === 1005) {
          toast.warning(
            <div>時間外アクセスエラー。<br />現在の時間帯はシステムをご利用いただけません。</div>
          );  
          return;
        }
        else {
          toast.error(
            <div>データの処理中にエラーが発生しました。<br />問題が解決しない場合は、管理者へお問い合わせください。</div>
          );  
          return;
        }
      }

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

  // 記録詳細画面から「編集する」が押されたとき
  const handleEditRecord = (fullRecord) => {
    try {
      const masterInfo = JSON.parse(localStorage.getItem('auth_data') || '{}')?.master_info || {};
      const allAreaList = masterInfo.area_info || [];
      // getinfo（一覧・詳細取得）が返す area/beach はエリア番号ではなくエリア名の文字列のため、
      // マスタとは名前で突き合わせる（setinfo登録時のarea/beachはエリア番号なので型が異なる点に注意）
      const areaObj = allAreaList.find(a => a.area === fullRecord.area);
      const beachObj = (areaObj?.beach_info || []).find(b => b.beach === fullRecord.beach);
      // EditView は selectedCoast.no / selectedCoast.name の形（useAreaInfo と同じ形）を期待する
      setSelectedCoast(areaObj ? { no: areaObj.no, name: areaObj.area } : '');
      setSelectedBeach(beachObj ? { no: beachObj.no, name: beachObj.beach } : '');
    } catch {
      setSelectedCoast('');
      setSelectedBeach('');
    }
    // 編集対象の日付はEditView側でexistingData.startDateから直接表示するため、
    // ここでApp.jsx共有のselectedDate/briefingDataは書き換えない
    // （以前はここでselectedDate/briefingDataを編集対象のデータで上書きしていたが、
    // 新規登録画面(LogEntryView)もこの2つを共有しているため、編集画面を経由した後に
    // 新規登録へ遷移すると日付やブリーフィング内容が編集対象のもので汚染されてしまっていた）
    const normalizedRecord = fullRecord.end_time !== undefined && fullRecord.endTime === undefined
      ? { ...fullRecord, endTime: fullRecord.end_time }
      : fullRecord;
    // getinfo の記録には seq が無く detail_key のみのため、ヘッダーの「#01」表示用に詰め替える
    if (normalizedRecord.seq === undefined) {
      normalizedRecord.seq = normalizedRecord.detail_key;
    }
    setEditingRecord(normalizedRecord);
    setView('edit');
  };

  const handleUpdate = async (formData) => {
    const toastId = toast.loading('更新中...');
    try {
      // area/beach は EditView の confirmSave で既に selectedCoast.no / selectedBeach.no
      // （マスタのエリア番号）がセット済みのため、ここでは破棄・再計算せずそのまま使う
      // （handleSubmit と同じ理由。editingRecord.area/beach は getinfo が返すエリア名の
      // 文字列であり、エリア番号ではないため、これで上書きすると area/beach が不正な値になる）
      const { date, id, timestamp, isSynced, startDate, members, ...rest } = formData;
      // membersは自分以外のパトロールメンバーのみを送る（handleSubmitと同様。setinfoの仕様に
      // login_userは無く、記録担当者をmembersに混ぜて送ってはいけない）。
      // {id, user_id}のオブジェクト配列のまま送るため、文字列への変換はしない
      const result = await setinfoApi({
        type: 1,
        data: {
          ...rest,
          members: members || [],
          key: editingRecord.key,
          detail_key: editingRecord.detail_key,
          startDate: editingRecord.startDate,
          delete_flg: false,
        },
      });
      if (result?.result === false) {
        toast.dismiss(toastId);
        if (result.error_no === 1001) {
          toast.warning(
            <div>ログイン情報が確認できません。<br />再ログインして再度保存してください。</div>
          );
          logout();
          return;
        }
        if (result.error_no === 1002) {
          toast.warning(
            <div>ログイン情報が不正です。<br />再ログインして再度保存してください。</div>
          );
          logout();
          return;
        }
        if (result.error_no === 1004) {
          toast.warning(
            <div>ログインの有効期限が切れました。<br />再ログインして再度保存してください。</div>
          );
          logout();
          return;
        }
        if (result.error_no === 1005) {
          toast.warning(
            <div>時間外アクセスエラー。<br />現在の時間帯はシステムをご利用いただけません。</div>
          );
          return;
        }
        throw new Error(result?.error_msg || '更新失敗');
      }
      await queryClient.invalidateQueries({ queryKey: ['records-list'] });
      await queryClient.invalidateQueries({ queryKey: ['record-detail'] });
      toast.success('更新しました', { id: toastId });
      setEditingRecord(null);
      setView('recordDetail');
    } catch (e) {
      toast.error(e?.message || '更新に失敗しました', { id: toastId });
    }
  };

  // 「ビーチを選択」のハンドラー
  const handleSelectBeach = (beach) => {

    // seqインクリメント処理をここで行う
    const foundRecord = savedRecords.find(r => r.beach === beach.name);

    if (foundRecord) {
      const updated = { ...foundRecord };

      if (foundRecord.loginId !== user.id) {
        updated.members = briefingData.members.length === 0
          ? []
          : briefingData.members;
      }

      if (foundRecord.isSynced !== 0) {
        updated.seq = (Number(foundRecord.seq) || 0) + 1;
      }

      setTargetRecords(updated);
    }
    else {
      setTargetRecords([]);
    }

    setSelectedBeach(beach);
    setView('edit');
  };

  // ブリーフィング画面「開始」ボタンハンドラー
  const handleBriefingComplete = (data) => {
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
      handover: "",
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
          onSelectHandover={(item) => {
            setSelectedRecord(item);
            setRecordDetailSource('briefing');
            setView('recordDetail');
          }}
        />
      );

    // ---- 新規登録画面 ---- 
    case 'list':
//console.log('syncedRecords:', syncedRecords);
//console.log('savedRecords:', savedRecords);

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
    
    case 'records':
      return (
        <RecordsListView
          user={user}
          onBack={() => setView('home')}
          onSelectRecord={(rec) => { setSelectedRecord(rec); setRecordDetailSource('records'); setView('recordDetail'); }}
          selectedKeys={recordsCsvSelectedKeys}
          setSelectedKeys={setRecordsCsvSelectedKeys}
          filterAreas={recordsFilterAreas} setFilterAreas={setRecordsFilterAreas}
          filterDateFrom={recordsFilterDateFrom} setFilterDateFrom={setRecordsFilterDateFrom}
          filterDateTo={recordsFilterDateTo} setFilterDateTo={setRecordsFilterDateTo}
          filterDow={recordsFilterDow} setFilterDow={setRecordsFilterDow}
          filterMembers={recordsFilterMembers} setFilterMembers={setRecordsFilterMembers}
          draftAreas={recordsDraftAreas} setDraftAreas={setRecordsDraftAreas}
          draftDateFrom={recordsDraftDateFrom} setDraftDateFrom={setRecordsDraftDateFrom}
          draftDateTo={recordsDraftDateTo} setDraftDateTo={setRecordsDraftDateTo}
          draftDow={recordsDraftDow} setDraftDow={setRecordsDraftDow}
          draftMembers={recordsDraftMembers} setDraftMembers={setRecordsDraftMembers}
          sortCol={recordsSortCol} setSortCol={setRecordsSortCol}
          sortDir={recordsSortDir} setSortDir={setRecordsSortDir}
          currentPage={recordsCurrentPage} setCurrentPage={setRecordsCurrentPage}
          showCancelled={recordsShowCancelled} setShowCancelled={setRecordsShowCancelled}
        />
      );

    case 'recordDetail':
      return (
        <RecordDetailView
          user={user}
          recordSummary={selectedRecord}
          onBack={() => setView(recordDetailSource)}
          onEdit={handleEditRecord}
          hideActions={recordDetailSource === 'briefing'}
        />
      );

    // ---- ログ入力画面 ---- 
    case 'edit':
//      console.log('selectedBeach:', selectedBeach);
//      console.log('savedRecords:', savedRecords);
//      console.log('syncedRecords:', syncedRecords);
//      console.log('targetRecords:', targetRecords);
      const foundSyncedRecord = syncedRecords.find(r => r.beach === selectedBeach.name);
      const syncedRecoredSeq = foundSyncedRecord ? (Number(foundSyncedRecord.detail_key) || 0) : 0;

      // ログ詳細画面からの編集（既存レコードあり）は EditView（ログ編集）、
      // ビーチ選択からの新規登録は LogEntryView（ログ入力、issue27適用前のUIを復元）を使う
      if (editingRecord) {
        return (
          <EditView
            user={user}
            selectedCoast={selectedCoast}
            selectedBeach={selectedBeach}
            onBack={() => { setEditingRecord(null); setView('recordDetail'); }}
            onUpdate={handleUpdate}
            existingData={editingRecord}
            profileList={profileList}
            seq={1}
          />
        );
      }

      return (
        <LogEntryView
          user={user}
          selectedCoast={selectedCoast}
          selectedBeach={selectedBeach}
          selectedDate={format(selectedDate, 'yyyy-MM-dd')}
          onSave={handleSave}
          onSubmit={handleSubmit}
          onBack={() => setView('list')}
          existingData={(() => {
            if (targetRecords && Object.keys(targetRecords).length > 0) {
              return targetRecords;
            }
            const nextSeq = 1 + syncedRecoredSeq;
            return {
              ...briefingData,
              seq: nextSeq,
              unpatrolled: false,
              id: undefined,
              isSynced: 0,
            };
          })()}
          profileList={profileList}
          seq={1}
        />
      );

    default:
      return <HomeView onNavigate={(target) => setView(target)} />;
  }};

  // フッターメニューからの遷移。「ログデータ」はここから入り直した時だけ検索条件を初期化する
  // （ログ詳細画面との行き来 records ⇄ recordDetail では条件を保持したいため、そちらは resetしない）
  const handleFooterNavigate = (target) => {
    if (target === 'records') resetRecordsFilters();
    setView(target);
  };

  return (
    <div>
      <Toaster richColors position="top-center" />
      {renderView()}
      {user && FOOTER_VIEWS.includes(view) && (
        <GlobalFooter onNavigate={handleFooterNavigate} />
      )}
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