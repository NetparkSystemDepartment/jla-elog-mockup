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

function App() {
  const [user, setUser] = useState(null);
  const [loginId, setLoginId] = useState('');
  //const [view, setView] = useState('list');
  const [view, setView] = useState('home'); // デフォルトをhomeに
  
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

  const [selectedCoast, setSelectedCoast] = useState('');
  const [selectedBeach, setSelectedBeach] = useState('');
  const today = startOfDay(new Date());
  const [baseDate, setBaseDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [savedRecords, setSavedRecords] = useState([]);

  useEffect(() => {
    if (user && view !== 'briefing') loadRecords();
  }, [selectedDate, user, view]);

  const loadRecords = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const result = await getRecordsByDate(dateStr);
    setSavedRecords(result || []);
  };

    // 保存処理（子から呼ばれる）
    const handleSave = async (formData) => {
      
      const formattedDate = format(formData.startDate, 'yyyy-MM-dd');
      const beachName = selectedBeach;
  
      const record = { 
        ...formData, 
        beach: beachName, 
        date: formattedDate, 
        timestamp: Date.now() 
      };
  
      try {
  
        const existing = await checkRecordByDate(formattedDate, beachName);
  
      if (existing) {
        const ok = window.confirm(`${beachName} の ${formattedDate} のデータは既に存在します。上書きしてもよろしいですか？`);
        if (!ok) return; // キャンセルならここで処理を終了
      }      
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
  
//  const handleLogin = (e) => {
//    e.preventDefault();
//    if (!loginId.trim()) return toast.error('IDを入力してください');
//    setUser(loginId);
//    setView('briefing'); // ログイン -> ブリーフィング
//  };

  // ログイン時のコールバック
  const handleLogin = (userInfo) => {
    setUser(userInfo);
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
    warn: [data.warn], // MultiSelect用なら配列にする
    alert: [data.alert],
    handover: data.handoverMemo,
    note: data.noteMemo,
    members: [user.id, data.member1, data.member2].filter(Boolean)
  };
  setBriefingData(mappedData);
  setView('home');
};

  // --- 画面分岐 ---

  // ログイン画面
  if (!user) {
    return <LoginView onLogin={handleLogin} />;
  }

//  if (user.role === 'staff' && view === 'briefing') {
//    return <BriefingView onComplete={(data) => {
//      setBriefingData(data); // ここでEditView用の初期値を作る
//      setView('list');
//    }} />;
//  }
// 2. 監視員でブリーフィングがまだの場合
  if (user.role === 'staff' && !briefingData) {
    return <BriefingView onComplete={(data) => {
      setBriefingData(data);
      setView('home'); // ブリーフィング完了後はホームへ
    }} />;
  }
  

  // ログイン画面
//  if (!user) {
//    return ( 
//      <div style={styles.appcontainer}>
//      <Toaster position="top-center" richColors />
//      <header style={styles.headerStyle}>
//        <span style={{color: '#fff', fontSize: '32px', marginTop: '24px'}}> 🔵沖縄e-log</span>
//      </header>
//      <div style={styles.fullScreenCenter}>
//        <form onSubmit={handleLogin} style={styles.form}>
//          <label>ユーザーID（記録担当者）</label>
//          <input 
//            type="text" value={loginId} 
//            onChange={(e) => setLoginId(e.target.value)}
//            placeholder="ユーザーID" style={styles.input}
//          />
//          <button type="submit" style={styles.button}>ログイン</button>
//          <span>ユーザーIDに関するお問い合わせは、沖縄LS協会e-log担当（090-0000-0000）までご連絡ください。</span>
//        </form>
//      </div>
//      </div>
//    );
//  }

  // 2. ブリーフィング画面（EditViewの左列項目を入力）
  if (view === 'briefing' || (user && !briefingData)) {
    return <BriefingView onComplete={handleBriefingComplete} />;
  }

  // 3. メイン画面
//  return (
//    <>
//      <Toaster position="top-center" richColors />
//      <div style={styles.statusBar}>
//        ID: {user.id} ({user.role === 'admin' ? '管理者' : '記録担当者'}) | 
//        <button onClick={() => setUser(null)} style={styles.logoutBtn}>ログアウト</button>
//      </div>
//
//      {view === 'list' ? (
//        <ListView 
//          baseDate={baseDate} setBaseDate={setBaseDate}
//          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
//          savedRecords={savedRecords}
//          onSelectBeach={handleSelectBeach}
//          onSelectCoast={(coast) => setSelectedCoast(coast)}
//        />
//      ) : (
//        <EditView
//          selectedCoast={selectedCoast} 
//          selectedBeach={selectedBeach}
//          selectedDate={selectedDate} 
//          onSave={handleSave}
//          onBack={() => setView('list')}
//          // --- 重要: 既存データがない場合、ブリーフィングデータを初期値として渡す ---
//          existingData={savedRecords.find(r => r.beach === selectedBeach) || briefingData}
//        />
//      )}
//    </>
//  );

  // 画面分岐
  switch (view) {
    case 'home':
      return <HomeView user={user} onNavigate={(target) => setView(target)} />;
    
    case 'list':
      return (
        <>
         <ListView 
          baseDate={baseDate} setBaseDate={setBaseDate}
          selectedDate={selectedDate} setSelectedDate={setSelectedDate}
          savedRecords={savedRecords}
          onSelectBeach={handleSelectBeach}
          onSelectCoast={(coast) => setSelectedCoast(coast)}
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
      return (
        <EditView
          selectedCoast={selectedCoast} 
          selectedBeach={selectedBeach}
          selectedDate={selectedDate} 
          onSave={handleSave}
          onBack={() => setView('list')}
          // --- 重要: 既存データがない場合、ブリーフィングデータを初期値として渡す ---
          existingData={savedRecords.find(r => r.beach === selectedBeach) || briefingData}
        />
      );

    default:
      return <HomeView onNavigate={(target) => setView(target)} />;
  }


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