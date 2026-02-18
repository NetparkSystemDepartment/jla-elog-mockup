import React, { useState, useEffect } from 'react';
import ListView from './views/ListView';
import EditView from './views/EditView';
import { getAllRecords, saveRecord, getRecordsByDate} from './db';
import { startOfDay, format } from 'date-fns';

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
    const filteredData = await getRecordsByDate(dateStr);
    setSavedRecords(filteredData);
  };

  // 保存処理（子から呼ばれる）
  const handleSave = async (formData) => {
    const record = { 
      ...formData, 
      beach: selectedBeach, 
      date: format(selectedDate, 'yyyy-MM-dd'), 
      timestamp: Date.now() 
    };
    await saveRecord(record);
    await loadRecords();
    setView('list');
  };

  // 海岸選択時の処理
  const handleSelectCoast = (coastName) => {
    setSelectedCoast(coastName);
  };

  // ビーチ選択時の処理
  // モックアップは下記3ビーチに限定
  const targetBeaches = ['裏真栄田ビーチ', '仲泊ビーチ', '冨着ビーチ'];

  const handleSelectBeach = (beachName) => {
    if (targetBeaches.includes(beachName)) {
      setSelectedBeach(beachName);
      setView('edit');
    }
  };

  return (
    <>
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