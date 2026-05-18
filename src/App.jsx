import React, { useState, useEffect } from 'react';
import ListView from './views/ListView';
import EditView from './views/EditView';
import LoginView from './views/LoginView';
import HomeView from './views/HomeView';
import BriefingView from './views/BriefingView';
import RecordsListView from './views/RecordsListView';
import { getAllRecords, saveRecord, getRecordsByDate, checkRecordByDate} from './db';
import { startOfDay, format } from 'date-fns';
import { toast, Toaster } from 'sonner';
// 
//import { useAuth } from './contexts/authContext';
// ダミー
import { useAuth } from './contexts/dummyAuthContext';
import { supabase } from './supabaseClient';
import { fetchAllProfiles } from './api';

const DUMMYSTAFF = [ 'staff01', 'staff02', 'staff03', 'staff04', 'staff05' ];

function App() {
  //const [user, setUser] = useState(null);
  //const { user, login, logout } = useAuth(); // Contextから取得
  const { user, login, logout } = useAuth() || {}; // Contextから取得
  const [loginId, setLoginId] = useState('');
  //const [view, setView] = useState('list');
  //const [view, setView] = useState('home'); // デフォルトをhomeに
  const [view, setView] = useState('briefing'); // デフォルトをhomeに
  
  // --- 追加: ブリーフィングで設定する共有データ ---
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
      localStorage.removeItem('briefing_data');
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


  useEffect(() => {
    if (user && view === 'records') loadDBRecords();
    else if (user && view !== 'briefing') {loadRecords()}
//    else if (user && view === 'briefing') {loadRecentHandovers(); loadProfileList()};
    else if (user && view === 'briefing') {dummyLoadProfileList()};
  }, [selectedDate, user, view]);

  // データ読み込み処理（indexedDB）
  const loadRecords = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const result = await getRecordsByDate(dateStr);
    setSavedRecords(result || []);
  };

  // データ読み込み処理（サーバー）
  const loadDBRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('patrol_records')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      console.error('loadDBRecords(data):', data);

      const formattedRecords = data.map(record => ({
        ...record,
        ...record.data, // jsonbの中身（weather, members等）をトップレベルに展開
      }));

      console.error('loadDBRecords(formattedRecords):', formattedRecords);

      setSavedRecords(formattedRecords || []);
  
    } catch (error) {
      console.error('データ取得失敗:', error.message);
      toast.error('データの取得に失敗しました');
    }
  }

  // データ読み込み処理（申し送り）
  const loadRecentHandovers = async () => {
    const { data, error } = await supabase
      .from('patrol_records')
      .select('date, beach, user_id, data->handover, data->note') // jsonb内の特定フィールドのみ
      .order('created_at', { ascending: false });

    if (!error) {
      console.log('loadRecentHandovers:', data);
      setRecentHandovers(data);
    }

    if (!error && data) {
      const formatted = data.map(r => ({
        date: r.date,
        beach: r.beach,
        // JSX側で使っている名前に合わせる
        handover: r.data?.handover || 'なし', 
        user_id: r.user_id
      }));
      console.log('loadRecentHandovers:', data);
      setRecentHandovers(formatted);
  }
  };

  // データ読み込み処理（ユーザー情報）
  const loadProfileList = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, role')

    if (error) {
      console.error('Error fetching profiles:', error.message)
    }

    if (data) {
      // roleでフィルタリング、かつ自分以外のメンバー
      const filteredData = data.filter(profile => 
        profile.role === user.role && profile.id !== user.id);

      console.log('loadProfileList:', filteredData);
      const idList = filteredData.map(profile => profile.id);
      console.log('idList:', idList);
      setProfileList(idList);
    }    
  };

  // データ読み込み処理（ユーザー情報）ダミー
  const dummyLoadProfileList = async () => {

      const idlist = DUMMYSTAFF;
//      console.log('idList:', idlist);
      setProfileList(idlist);
  
  };

  // 保存処理（子から呼ばれる）
  // ローカル保存（indexedDB）
  const handleSave = async (formData) => {
    const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
    const beachName = selectedBeach;
  
    const record = { 
      ...formData, 
      beach: beachName, 
      date: formattedDate, 
      isSynced: false, // サーバー未送信フラグ
      timestamp: Date.now() 
    };

    try {
  
      //const existing = await checkRecordByDate(formattedDate, beachName);
  
        //if (existing) {
        //  const ok = window.confirm(`${beachName} の ${formattedDate} のデータは既に存在します。上書きしてもよろしいですか？`);
        //  if (!ok) return; // キャンセルならここで処理を終了
        //}      
        // MSW(fetch) を通さず、直接 IndexedDB へ保存
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
  
    // 保存処理（子から呼ばれる）
    // サーバー保存
    const handleSubmit = async (formData) => {
      
      const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
      const beachName = selectedBeach;
  
      const record = { 
        ...formData, 
        beach: beachName, 
        date: formattedDate, 
        isSynced: false, // サーバー未送信フラグ
        timestamp: Date.now() 
      };

      const id = await saveRecord(record);
      console.log('indexedDB保存成功（ID）:', id);

      console.log("supabase:", user);

      const recordToSave = {
        date: formattedDate,
        beach: selectedBeach,
        user_id: user.id,
        data: { ...formData }
      };

      try {
  
//        const existing = await checkRecordByDate(formattedDate, beachName);
//  
//      if (existing) {
//        const ok = window.confirm(`${beachName} の ${formattedDate} のデータは既に存在します。上書きしてもよろしいですか？`);
//        if (!ok) return; // キャンセルならここで処理を終了
//      }      
//        // MSW(fetch) を通さず、直接 IndexedDB へ保存
//        const id = await saveRecord(record);
      
        const { error } = await supabase
          .from('patrol_records')
          .insert([recordToSave]);

//          console.log('保存成功（ID）:', id);
        console.log('保存成功');
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

    // ログイン時のコールバック
  const handleLogin = async (userInfo) => {
    //setUser(userInfo);
    //login(userInfo);


    // 管理者の場合もブリーフィング画面へ
    if (userInfo.role === 'admin') {
      setView('briefing');
    } else {
      setView('briefing');
    }
  };

  const handleSelectBeach = (beachName) => {
    const targetBeaches = ['裏真栄田ビーチ', 'アボガマ', '希望ヶ丘ビーチ'];
    if (targetBeaches.includes(beachName)) {
      setSelectedBeach(beachName);
      setView('edit');
    }
  };

  // ブリーフィング完了時の処理
//  const handleBriefingComplete = (data) => {
//    setBriefingData(data);
//    setView('list'); // メイン画面へ
//  };

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
    handover: data.handoverMemo,
    note: data.noteMemo,
    members: data.members,
    carType: data.carType,
    carNo: data.carNo,
    visitors: 0,
    jpWarning: 0,
    forWarning: 0,
    jpTourist: 0,
    forTourist: 0,
  };
  setBriefingData(mappedData);
  console.log('handleBriefingComplete:', mappedData);
  setView('home');
};

  // --- 画面分岐 ---
  const renderView = () => {
  
    // ログイン画面
    if (!user) {
      return <LoginView />;
    }

//    return <BriefingView onComplete={(data) => {
//      setBriefingData(data); // ここでEditView用の初期値を作る
//      setView('list');
//    }} />;
//  }
    // ブリーフィング画面
//    if (view === 'briefing') {
//    console.log('briefingData:', briefingData);
//    console.log('retrun BriefingView!');
//    return <BriefingView onComplete={(data) => {
//      setBriefingData(data);
//      console.log('setBriefingData:', data);
//      setView('home'); // ブリーフィング完了後はホームへ
//    }} />;
//  }
  

  // 画面分岐
    switch (view) {
    case 'home':
      return <HomeView user={user} onNavigate={(target) => setView(target)} />;
//    case 'home':
//      return (
//        <HomeView 
//          user={user} 
//          onNavigate={async (target) => {
//          // もし「記録一覧」が押されたら、データをロードしてから画面を変える
//          if (target === 'records') {
//            await loadDBRecords(); 
//          }
//          // その後、画面を切り替える
//            setView(target);
//          }} 
//        />
//      );

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
      return (
        <>
         <ListView 
          user={user} 
          baseDate={baseDate} setBaseDate={setBaseDate}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          savedRecords={savedRecords}
          onSelectBeach={handleSelectBeach}
          onSelectCoast={(coast) => setSelectedCoast(coast)}
          onNavigate={(target) => setView(target)}
        />
         {/* ListViewの下にもHomeViewと同じフッターを配置すると使いやすくなります */}
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
 //     console.log('selectedDate:', selectedDate);
      return (
        <EditView
          user={user}
          selectedCoast={selectedCoast} 
          selectedBeach={selectedBeach}
          selectedDate={selectedDate} 
          onSave={handleSave}
          onSubmit={handleSubmit}
          onBack={() => setView('list')}
          // --- 重要: 既存データがない場合、ブリーフィングデータを初期値として渡す ---
          existingData={savedRecords.find(r => r.beach === selectedBeach) || briefingData}
          profileList={profileList}
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
  appcontainer: { width: '100%', maxWidth: '820px', margin: '0 auto', minheight: '100vh' },
  headerStyle: { backgroundColor: '#44445A', width: '100%', position: 'sticky', top: '0', zIndex: '100' },
  container: { padding: '20px', maxWidth: '500px', margin: '0 auto' },
  fullScreenCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#f0f4f8' },
  form: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '300px' },
  briefingGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' },
  field: { display: 'flex', flexDirection: 'column', gap: '5px' },
  input: { padding: '10px', borderRadius: '5px', border: '1px solid #ccc' },
  button: { width: '100%', padding: '15px', backgroundColor: '#0a9396', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold' },
  statusBar: { padding: '10px', textAlign: 'right', fontSize: '12px', color: '#666' },
  logoutBtn: { border: 'none', background: 'none', textDecoration: 'underline' }
};

export default App;