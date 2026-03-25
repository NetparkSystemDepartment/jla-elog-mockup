import React, { useState, useEffect } from 'react';
import ListView from './views/ListView';
import EditView from './views/EditView';
import { getAllRecords, saveRecord, getRecordsByDate, checkRecordByDate} from './db';
import { startOfDay, format } from 'date-fns';
import { toast, Toaster } from 'sonner';

function App() {
  const [view, setView] = useState('list');
  const [selectedCoast, setSelectedCoast] = useState('');
  const [selectedBeach, setSelectedBeach] = useState('');
  const today = startOfDay(new Date());
  const [baseDate, setBaseDate] = useState(today);
  const [selectedDate, setSelectedDate] = useState(today);
  const [savedRecords, setSavedRecords] = useState([]);

  // DBからデータを読み込む（日付が変わるたびに実行）
  useEffect(() => {
    loadRecords();
  }, [selectedDate]);

  const loadRecordswithFilter = async () => {
    const allData = await getAllRecords();
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setSavedRecords(allData.filter(r => r.date === dateStr));
  };

   const loadRecords = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    //const response = await fetch(`/api/records?date=${dateStr}`);
    //const url = `/api/records?date=${selectedDate}`;
    //console.log("UI側が投げようとしているURL:", url);
    //const data = await response.json();

    let data = [];
    
    console.log("dateStr:", dateStr);
    // 検索。結果が null/undefined なら空配列にする
    const result = await getRecordsByDate(dateStr);
    data = result || [];
 
    // data には IndexedDB から取得した配列が入る
    setSavedRecords(data); 
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

  // 海岸選択時の処理
  const handleSelectCoast = (coastName) => {
    setSelectedCoast(coastName);
  };

  // ビーチ選択時の処理
  // モックアップは下記3ビーチに限定
  const targetBeaches = ['裏真栄田ビーチ', 'アボガマ', '希望ヶ丘ビーチ'];

  const handleSelectBeach = (beachName) => {
    if (targetBeaches.includes(beachName)) {
      setSelectedBeach(beachName);
      setView('edit');
    }
  };

  return (
    <>
      <Toaster position="top-center" richColors />
      {view === 'list' ? (
        <ListView 
          baseDate={baseDate} 
          setBaseDate={setBaseDate}
          selectedDate={selectedDate} 
          setSelectedDate={setSelectedDate}
          savedRecords={savedRecords}
          onSelectBeach={handleSelectBeach}
          onSelectCoast={handleSelectCoast}
        />
      ) : (
        <EditView
          selectedCoast={selectedCoast} 
          selectedBeach={selectedBeach}
          selectedDate={selectedDate}
          onSave={handleSave}
          onBack={() => setView('list')}
          // 既存データがあれば渡す
          existingData={savedRecords.find(r => r.beach === selectedBeach)}
        />
      )}
    </>
  );
}


export default App;