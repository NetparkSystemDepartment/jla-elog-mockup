import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ArrowDownUp, ArrowUp, ArrowDown } from 'lucide-react';
import { TIDE_OPTIONS, DIRECTIONS, WARNING_OPTIONS, ALERT_OPTIONS, WIND_SPEED_OPTIONS } from '../constants';
import { MultiSelectInput } from '../components/MultiSelectInput';
import { useAuth } from '../contexts/authContext';
import { getinfoApi } from '../api/recordApi';
// パトロールメンバー
import { useSafeMembers } from '../useSafeMembers';
// 車種名
import { useSafeCarInfo } from '../useSafeCarInfo';
import { toast } from 'sonner';
import Select from 'react-select';
import { loadWeeklyRecords } from '../api';


// for phase1
const HANDOVERAREA = ['恩納村'];

function BriefingView({ user, onComplete, recentHandovers = [], profileList }) {

  const { logout } = useAuth();
  
  // 🛠️ ローカルストレージから既存データを読み込む初期化関数
  const [data, setData] = useState(() => {
    const savedData = localStorage.getItem('briefing_data');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('ローカルストレージのデータ解析に失敗:', e);
      }
    }
    // データがない場合のデフォルト値
    return {
      members: '',
      carType: '', carNo: '',
      tide: '', highTideTime: '', highTide: '', lowTideTime: '', lowTide: '',
      warn: '', alert: '', windDir: '', windSpeed: '',
      handoverMemo: '', noteMemo: ''
    };
  });

  const [noticeList, setNoticeList] = useState([]);
  const [isInfoLoading, setIsInfoLoading] = useState(true);

  // サーバーのBody部に渡すパラメーター（Payload）
  const requestBody = {
    type: 1,
// debug only    
// key: 59,
  };

  // 申し送りデータの取得
  useEffect(() => {
//console.log('申し送りデータの取得', requestBody);
    const fetchNoticeData = async () => {
      try {
        setIsInfoLoading(true);
        
        // 共通関数を呼び出し
        const resData = await getinfoApi(requestBody);
//console.log('resData:', resData);      

        // トークンの有効期限切れ、利用時間外、再ログイン
        if (resData.result === false &&
          (resData.error_no === 1002 || resData.error_no === 1004 || resData.error_no === 1005) 
        ) {
          toast.warning('再度ログインしてください。');
          logout();
        }

        if (resData && resData.data) {
          
          // 申し送りが null, undefined, または "なし" のデータを除外
          const filteredData = resData.data.filter(item => {
            if (item.handover === null || item.handover === undefined) {
              return false;
            }

            // 除外したいキーワードのリスト
            const excludeKeywords = ["なし", "特になし"];

            // 前後の空白を削除した上で、リストに含まれていれば除外
            if (excludeKeywords.includes(String(item.handover).trim())) {
              return false;
            }

            return true;
          });

//console.log('filteredData:', filteredData);

          // 最優先: priority(昇順) ➔ key(降順) ➔ detail_key(降順)
          const initialSortedData = filteredData.sort((a, b) => {
            
            // --- 第1キー: priority の昇順 (a - b) ---
            const aPriority = a.priority !== undefined && a.priority !== null ? Number(a.priority) : 999;
            const bPriority = b.priority !== undefined && b.priority !== null ? Number(b.priority) : 999;
            
            if (aPriority !== bPriority) {
              return aPriority - bPriority; // 0(高) ➔ 1(中) ➔ 2(低) の昇順
            }

            // --- 第2キー: startDate の降順 (新しい順) ---
            // null や undefined 対策として安全に空文字にします
            const aDate = a.startDate !== undefined && a.startDate !== null ? String(a.startDate) : '';
            const bDate = b.startDate !== undefined && b.startDate !== null ? String(b.startDate) : '';
            
            if (aDate !== bDate) {
              // 通常は a.localeCompare(b) で昇順（古い順）になりますが、
              // 降順（新しい順）にしたいので、b と a の位置を入れ替えて比較します
              return bDate.localeCompare(aDate, 'ja', { numeric: true });
            }            
            // --- 第3キー: key の降順 (b - a) ---
            const aKey = Number(a.key) || 0;
            const bKey = Number(b.key) || 0;
            
            if (bKey !== aKey) {
              return bKey - aKey; // 値が大きい方を先にする
            }

            // --- 第4キー: detail_key の降順 (b - a) ---
            const aDetailKey = Number(a.detail_key) || 0;
            const bDetailKey = Number(b.detail_key) || 0;
            
            return bDetailKey - aDetailKey; // 値が大きい方を先にする
          });

          // 加工・ソートが完了したデータをStateにセット
          setNoticeList(initialSortedData);

          // 1週間分のデータを取り込み直す
          await loadWeeklyRecords();
          
        }
      } catch (err) {
        console.error('申し送り一覧の取得に失敗:', err);
      } finally {
        setIsInfoLoading(false);
      }
    };

    fetchNoticeData();
  }, []);

  // パトロールメンバー
  const safeMembers = useSafeMembers();
  // ログイン者を除く
  const exceptLogin = safeMembers.filter((member, index) => (member !== user.id));;
//console.log('exceptLogin:', exceptLogin);
  // react-selectで使えるように
  const loginOptions = exceptLogin.map(item => ({
    value: item,
    label: item
  }));
  const warningOptions = WARNING_OPTIONS.map(item => ({
    value: item,
    label: item
  }));
  const alertOptions = ALERT_OPTIONS.map(item => ({
    value: item,
    label: item
  }));
  // const directionOptions = DIRECTIONS.map(item => ({
  //   value: item.id,
  //   label: item.label
  // }));
   
  // 車両名
  const safeCarInfo = useSafeCarInfo();
  //const carTypeOptions = safeCarInfo.map(item => ({
  //  value: item.order,
  //  label: item.carType
  //}));

  // 申し送り一覧のエリア
  const [selectedArea, setSelectedArea] = useState(''); // 初期値は空（未選択）

  // チェックされた行のインデックスを保持
  const [selectedRows, setSelectedRows] = useState([]); 

  // ページネーター用
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // ソートロジックの追加
  const sortedNotices = React.useMemo(() => {
    let sortableItems = [...noticeList];
// console.log('sortConfig:', sortConfig);  
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        // nullやundefinedの対策
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';

        // 優先度（priority）の場合は数値として比較する
        if (sortConfig.key === 'priority') {
          // データがない場合は一番後ろ（大きな値）にする安全ガード
          const aNum = aValue !== undefined && aValue !== null ? Number(aValue) : 999;
          const bNum = bValue !== undefined && bValue !== null ? Number(bValue) : 999;
          
          return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
// console.log('sortableItems:', sortableItems);  
    return sortableItems;
  }, [noticeList, sortConfig]);

  const itemsPerPage = 5;
  const totalPages = Math.ceil(sortedNotices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // 表示する分だけを切り出す
  const currentHandovers = sortedNotices.slice(indexOfFirstItem, indexOfLastItem);

  // ページ変更ハンドラー
  const handlePrev = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
    setSelectedRows([]); // ページを切り替えたら選択をクリア
  };
  const handleNext = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
    setSelectedRows([]); // ページを切り替えたら選択をクリア
  };

  // 開始ボタン
  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('briefing_data', JSON.stringify(data));
    onComplete(data);
  };

  // ソートボタンのハンドラー
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      // 降順の時にさらに押されたらソートを解除する
      setSortConfig({ key: null, direction: 'asc' });
      return;
    }
    setSortConfig({ key, direction });
    setCurrentPage(1); // ソート順が変わったら1ページ目に戻す
  };

  // 【アドミン】全選択・解除の切り替え
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      // 現在のページに表示されている行の item.key をすべて集めてStateに入れる
      // ※ item.key が存在しない場合を考慮して item.detail_key などをフォールバックにしています
      const allCurrentKeys = currentHandovers.map(item => item.key || item.detail_key || item.id);
      setSelectedRows(allCurrentKeys);
    } else {
      // チェックが外されたら、完全に空にして全解除
      setSelectedRows([]);
    }
  };

  // 【アドミン】個別のチェック切り替え
  const handleSelectRow = (rowKey) => {
    setSelectedRows(prev => {
      if (prev.includes(rowKey)) {
        return prev.filter(key => key !== rowKey); // すでにチェックがあれば外す
      } else {
        return [...prev, rowKey]; // なければ追加する
      }
    });
  };

  return (
    <div style={briefingStyles.wrapper}>
      {/* 統一ヘッダー */}
      <header style={briefingStyles.header}>
        <div style={briefingStyles.logoGroup}>
          <div style={briefingStyles.logoCircle}></div>
          <h1 style={briefingStyles.logoText}>沖縄e-log</h1>
        </div>
      </header>

      <main style={briefingStyles.container}>
        <div style={{textAlign: 'center', marginBottom: '10px' }}>
          <span style={briefingStyles.historyTitle}>ブリーフィング</span>
        </div>

        <div style={briefingStyles.card}>
          <form onSubmit={handleSubmit}>
            <div style={briefingStyles.grid}>
              {/* 左列 */}
              <div style={briefingStyles.column}>
                {/* ログイン者（記録担当者）を追加 2026.5.18 */}
                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>ログイン者（記録担当者）</label>
                  <input
                    type="text"
                    value={(user.id + user.name) || ''}
                    disabled
                    style={briefingStyles.disabledInput}
                  />
                </div>
                <div style={{...briefingStyles.field, minHeight: '96px'}}>
                  <label style={briefingStyles.label}>自分以外のパトロールメンバー</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                    <Select
                      isMulti       // 複数選択可能（マルチセレクト）
                      isSearchable  // サジェスト検索有効
                      options={loginOptions}
                      value={(data.members || []).map(item => ({ value: item, label: item }))}
                      onChange={(selectedOptions) => {
                        const nextMembers = (selectedOptions || []).map(option => option.value);
                        setData({ ...data, members: nextMembers });
                      }}                      
                      placeholder="ユーザーID"
                      noOptionsMessage={() => "見つかりません"}
                      styles={customSelectStyles}
                    />

                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>使用車両</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    
                    <select 
                      style={{...briefingStyles.input, width: '50%' }} 
                        value={data.carType || ''} 
                        onChange={e => {
                          // 選択されたIDを数値に変換して保存（未選択時は空文字）
                          const val = e.target.value;
                          setData({ ...data, carType: val !== '' ? Number(val) : '' });
                        }}
                    >
                      <option value="">車種名</option>
                      {safeCarInfo.map(d => (
                        <option key={d.order} value={d.order}>
                        {d.carType}
                        </option>
                      ))}
                    </select>
                    
                    <input type="text" placeholder="No." style={{...briefingStyles.input, width: '50%'}} maxLength={4} inputMode="numeric"
                      value={data.carNo}
                      onChange={e => setData({...data, carNo: e.target.value = e.target.value.replace(/[^0-9]/g, "")})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>注意報</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                    <Select
                      isMulti       // 複数選択可能（マルチセレクト）
                      isSearchable={false}
                      options={warningOptions}
                      value={(data.warn || []).map(item => ({ value: item, label: item }))}
//                      onChange={(selectedOptions) => {
//                        const nextMembers = (selectedOptions || []).map(option => option.value);
//                        setData({ ...data, warn: nextMembers });
//                      }} 
                      // 6月末版で変更                     
                      onChange={(selectedOptions) => {
                        // react-select から渡されるオブジェクト配列を、単純な文字列の配列に変換
                        const currentValues = (selectedOptions || []).map(option => option.value);
  
                        let updatedValues = currentValues;

                        // 直前の状態（data.warn）と現在の状態を比較して、何が「新しく追加されたか」を判定
                        const prevValues = data.warn || [];
                        const addedValue = currentValues.find(val => !prevValues.includes(val));

                        if (addedValue === 'なし') {
                          // 「なし」が新しく選ばれたら、他の選択をすべてクリアして「なし」だけにする
                          updatedValues = ['なし'];
                        } else if (currentValues.includes('なし') && currentValues.length > 1) {
                          // 「なし」以外の項目が新しく選ばれたら、リストから「なし」を削除する
                          updatedValues = currentValues.filter(val => val !== 'なし');
                        }

                        setData({ ...data, warn: updatedValues });
                      }}                      
                      placeholder="注意報"
                      noOptionsMessage={() => "見つかりません"}
                      styles={customSelectStyles}
                    />
                  </div>
                 </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>警報</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                    <Select
                      isMulti       // 複数選択可能（マルチセレクト）
                      isSearchable={false}  // サジェスト検索有効
                      options={alertOptions}
                      value={(data.alert || []).map(item => ({ value: item, label: item }))}
                      // onChange={(selectedOptions) => {
                      //   const nextMembers = (selectedOptions || []).map(option => option.value);
                      //   setData({ ...data, alert: nextMembers });
                      // }}                      
                      // 6月末版で変更                     
                      onChange={(selectedOptions) => {
                        // react-select から渡されるオブジェクト配列を、単純な文字列の配列に変換
                        const currentValues = (selectedOptions || []).map(option => option.value);
  
                        let updatedValues = currentValues;

                        // 直前の状態（data.warn）と現在の状態を比較して、何が「新しく追加されたか」を判定
                        const prevValues = data.alert || [];
                        const addedValue = currentValues.find(val => !prevValues.includes(val));

                        if (addedValue === 'なし') {
                          // 「なし」が新しく選ばれたら、他の選択をすべてクリアして「なし」だけにする
                          updatedValues = ['なし'];
                        } else if (currentValues.includes('なし') && currentValues.length > 1) {
                          // 「なし」以外の項目が新しく選ばれたら、リストから「なし」を削除する
                          updatedValues = currentValues.filter(val => val !== 'なし');
                        }

                        setData({ ...data, alert: updatedValues });
                      }}                      
                      placeholder="警報"
                      noOptionsMessage={() => "見つかりません"}
                      styles={customSelectStyles}
                    />
                  </div>
                </div>
              </div>

              {/* 右列 */}
              <div style={briefingStyles.column}>
                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>潮汐</label>
                  <div style={briefingStyles.radioFlexStyle}>
                    {TIDE_OPTIONS.map(opt => (
                      <button 
                        key={opt.id} 
                        type="button"
                        onClick={() => {
                          setData({ ...data, tide: opt.id }); // IDを保存
                        }} 
                        style={{...briefingStyles.radioBtnStyle, backgroundColor: data.tide === opt.id ? '#e0f2fe' : '#fff', color: data.tide === opt.id ? '#0369a1' : '#64748b', borderColor: data.tide === opt.id ? '#38bdf8' : '#e2e8f0'}}>{opt.label}</button>))}
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>満潮時刻・高さ [cm]</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="time" style={briefingStyles.input}
                      value={data.highTideTime} onChange={e => setData({...data, highTideTime: e.target.value})} />
                    <input type="number" placeholder="高さ [cm]" style={{...briefingStyles.input, textAlign: 'right'}}
                      value={data.highTide} onChange={e => setData({...data, highTide: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>干潮時刻・高さ [cm]</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="time" style={briefingStyles.input}
                      value={data.lowTideTime} onChange={e => setData({...data, lowTideTime: e.target.value})} />
                    <input type="number" placeholder="高さ [cm]" style={{...briefingStyles.input, textAlign: 'right'}}
                      value={data.lowTide} onChange={e => setData({...data, lowTide: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>風向（方位）</label>
                  
                  <select 
                    style={briefingStyles.input} 
                      value={data.windDir || ''} 
                      onChange={e => {
                        // 選択されたIDを数値に変換して保存（未選択時は空文字）
                        const val = e.target.value;
                        setData({ ...data, windDir: val !== '' ? Number(val) : '' });
                      }}
                  >
                    <option value="">－選択ー</option>
                    {DIRECTIONS.map(d => (
                      <option key={d.id} value={d.id}>
                      {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>風速（天気予報）</label>
                  <div style={briefingStyles.radioFlexStyle}>
                    {WIND_SPEED_OPTIONS.map(opt => (
                      <button 
                        key={opt.id} 
                        type="button"
                        onClick={() => {
                          setData({ ...data, windSpeed: opt.id }); // IDを保存
                        }} 
                        style={{...briefingStyles.radioBtnStyle, backgroundColor: data.windSpeed === opt.id ? '#e0f2fe' : '#fff', color: data.tide === opt.id ? '#0369a1' : '#64748b', borderColor: data.windSpeed === opt.id ? '#38bdf8' : '#e2e8f0'}}>{opt.label}</button>))}
                  </div>
                </div>
              </div>
            </div>

            {/* メモエリア */}
            <div style={{ marginTop: '20px', paddingTop: '0px' }}>
              <div style={briefingStyles.field}>
                <label style={briefingStyles.label}>申し送りメモ（申し送り事項に反映する内容を記載）</label>
                <textarea
                  placeholder="100字以内"
                  style={briefingStyles.textarea}
                  value={data.handoverMemo}
                  maxLength={100}
                  onChange={e => setData({...data, handoverMemo: e.target.value})} />
                {/* 🛠️ 文字数カウンターを表示 */}
                <div style={{
                  right: '12px',
                  bottom: '8px',
                  fontSize: '11px',
                  color: data.handoverMemo.length >= 100 ? '#ef4444' : '#64748b', // 100文字に達したら赤くする
                  fontWeight: data.handoverMemo.length >= 100 ? 'bold' : 'normal',
                  userSelect: 'none',
                  textAlign: 'right'
                  }}>
                  {data.handoverMemo.length} / 100
                </div>                  
              </div>
              <div style={briefingStyles.field}>
                <label style={briefingStyles.label}>特記メモ（特記事項に反映する内容を記載）</label>
                <textarea
                  placeholder="100字以内"
                  style={briefingStyles.textarea}
                  value={data.noteMemo}
                  maxLength={100}
                  onChange={e => setData({...data, noteMemo: e.target.value})}
                />
                {/* 🛠️ 文字数カウンターを表示 */}
                <div style={{
                  right: '12px',
                  bottom: '8px',
                  fontSize: '11px',
                  color: data.handoverMemo.length >= 100 ? '#ef4444' : '#64748b', // 100文字に達したら赤くする
                  fontWeight: data.handoverMemo.length >= 100 ? 'bold' : 'normal',
                  userSelect: 'none',
                  textAlign: 'right'
                  }}>
                  {data.noteMemo.length} / 100
                </div>                  
              </div>
            </div>

            <button type="submit" style={briefingStyles.startButton}>開始する</button>
          </form>
        </div>

        {/* 再掲：申し送り一覧セクション */}
        <section style={briefingStyles.historySection}>
          <div style={{marginBottom: '10px' }}>
            <span style={briefingStyles.historyTitle}>申し送り一覧</span>
          </div>

          <div style={briefingStyles.historyPlaceholder}>
            <div style={briefingStyles.selectorWrapper}>
              <span style={briefingStyles.selectorLabel}>表示するエリアを選択</span>
              <div style={briefingStyles.selectContainer}>

                <select 
                  style={briefingStyles.areaSelect}
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                >
                  <option value="">エリア</option>
                  {HANDOVERAREA.map((area, idx) => (
                    <option key={idx} value={area}>{area}</option>
                  ))}
                </select>
                <ChevronDown size={18} style={briefingStyles.selectIcon} />
              </div>

            {/* 【アドミン】「全監視員に非表示」ボタン */}
            {user?.kind === 0 && (
              <button
                type="button"
                disabled
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#cbd5e1',
                  color: '#64748b',
                  border: '1px solid #94a3b8',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  cursor: 'not-allowed',
                  opacity: 0.8,
                  marginLeft: '288px',
                }}
              >
                全監視員に非表示
              </button>
            )}
          </div>
        </div>

        {/* ★ selectedArea の有無で表示を切り替える */}
        {!selectedArea ? (
          // 【初期表示：エリアが選ばれていない場合】
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: '#64748b', 
            backgroundColor: '#f8fafc', 
            borderRadius: '8px',
            border: '1px dashed #cbd5e1',
            fontSize: '14px'
          }}>
            <span>エリアを選択してください。</span>
          </div>
        ) : (
          // 【エリアが選択された場合：一覧とページネーターを表示】
          <>
            <div style={briefingStyles.table}>
                <div style={briefingStyles.tableHeader}>

                  {/* 【アドミン】一番左の全選択チェックボックス */}
                  {user?.kind === 0 && (
                    <div style={{ 
                      flex: 0.5, 
                      display: 'flex', 
                      flexDirection: 'column', // 縦並びにする
                      alignItems: 'center',    // 中央揃え
                      justifyContent: 'center',
                      gap: '2px'               // チェックボックスと文字の隙間
                    }}>
                      <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={
                          currentHandovers.length > 0 && 
                          currentHandovers.every(item => selectedRows.includes(item.key || item.detail_key || item.id))
                        }
                        style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span style={{ 
                        fontSize: '10px',      // 小さいフォント
                        color: '#64748b',      // 少し薄めのグレー
                        fontWeight: 'normal',
                        lineHeight: '1'
                      }}>
                        全選択
                      </span>
                    </div>
                  )}

                  {/* 1. 優先度 */}
                  <div 
                    onClick={() => requestSort('priority')} 
                    style={{ ...briefingStyles.headerCellSortable, flex: 1 }}
                  >
                    <span>優先度</span>
                    {sortConfig.key !== 'priority' && <ArrowDownUp size={14} style={{ marginLeft: '4px', color: '#94a3b8' }} />}
                    {sortConfig.key === 'priority' && sortConfig.direction === 'asc' && <ArrowUp size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                    {sortConfig.key === 'priority' && sortConfig.direction === 'desc' && <ArrowDown size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                  </div>

                  {/* 2. 対象ビーチ */}
                  <div 
                    onClick={() => requestSort('beach')} 
                    style={{ ...briefingStyles.headerCellSortable, flex: 1 }}
                  >
                    <span>対象ビーチ</span>
                    {sortConfig.key !== 'beach' && <ArrowDownUp size={14} style={{ marginLeft: '4px', color: '#94a3b8' }} />}
                    {sortConfig.key === 'beach' && sortConfig.direction === 'asc' && <ArrowUp size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                    {sortConfig.key === 'beach' && sortConfig.direction === 'desc' && <ArrowDown size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                  </div>

                  {/* 3. 日付 */}
                  <div 
                    onClick={() => requestSort('startDate')} 
                    style={{ ...briefingStyles.headerCellSortable, flex: 1 }}
                  >
                    <span>日付</span>
                    {sortConfig.key !== 'startDate' && <ArrowDownUp size={14} style={{ marginLeft: '4px', color: '#94a3b8' }} />}
                    {sortConfig.key === 'startDate' && sortConfig.direction === 'asc' && <ArrowUp size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                    {sortConfig.key === 'startDate' && sortConfig.direction === 'desc' && <ArrowDown size={14} style={{ marginLeft: '4px', color: '#2563eb' }} />}
                  </div>

                  <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>申し送り事項</div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>パトロールメンバー</div>
                </div>

                <div style={briefingStyles.tableBody}>
                  {currentHandovers.length > 0 ? (
                    currentHandovers.map((item, idx) => {
                      const memberArray = Array.isArray(item.members) 
                        ? item.members 
                        : (item.members ? [item.members] : []);
                      const displayMembers = memberArray.slice(0, 2);

                      return (
                        <div key={idx} style={briefingStyles.tableRow}>

                          {/* 【アドミン】各行の左端チェックボックス */}
                          {user?.kind === 0 && (
                            <div style={{ flex: 0.5, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedRows.includes(item.key || item.detail_key || item.id)}
                                onChange={() => handleSelectRow(item.key || item.detail_key || item.id)}                                
                                style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                              />
                            </div>
                          )}

                          <div style={{ flex: 1, fontWeight: 'bold' }}>
                            {item.priority == 0 && <span style={{ color: '#ef4444' }}>高</span>}
                            {item.priority == 1 && <span style={{ color: '#f59e0b' }}>中</span>}
                            {item.priority == 2 && <span style={{ color: '#10b981' }}>低</span>}
                            {item.priority === undefined || item.priority === null ? '-' : ''}
                          </div>                    
                          <div style={{ flex: 1 }}>{item.beach}</div>
                          <div style={{ flex: 1 }}>{item.startDate}</div>
                          <div style={{ flex: 2, fontSize: '12px', textAlign: 'left' ,
                            padding: '0 8px',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 3,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>{item.handover}</div>

                          <div style={{ 
                            flex: 1, display: 'flex', flexDirection: 'column', 
                            justifyContent: 'center', fontSize: '12px', lineHeight: '1.4' 
                          }}>
                            {displayMembers.length > 0 ? (
                              displayMembers.map((member, mIdx) => (
                                <div key={mIdx}>{member}</div>
                              ))
                            ) : (
                              <div>-</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>
                      該当する申し送り事項はありません。
                    </div>
                  )}
                </div>
              </div>

              {/* ページネーターもエリア選択時のみ一緒に表示する */}
              <div style={briefingStyles.pagination}>
                <button 
                  type="button" 
                  onClick={handlePrev} 
                  disabled={currentPage === 1}
                  style={{ ...briefingStyles.pageBtn, opacity: currentPage === 1 ? 0.3 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} /> 
                </button>
                <div style={briefingStyles.pageInfo}>
                  <strong>{currentPage}</strong> / {totalPages}
                </div>
                <button 
                  type="button" 
                  onClick={handleNext} 
                  disabled={currentPage === totalPages}
                  style={{ ...briefingStyles.pageBtn, opacity: currentPage === totalPages ? 0.3 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronRight size={16} />
                </button> 
              </div>
            </>
          )}
        
        </section>
      </main>
    </div>

  );
}

const briefingStyles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: { backgroundColor: '#08172A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' },
  
  container: { flex: 1, padding: '10px 10px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' ,
  },
  card: { backgroundColor: '#ffffff', borderRadius: '24px', padding: '20px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  column: { display: 'flex', flexDirection: 'column', gap: '12px' },
  /*field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', textAlign: 'left' },*/
  /*field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', textAlign: 'left' },*/
  field: { display: 'flex', flexDirection: 'column', marginBottom: '8px', textAlign: 'left' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#374151' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  icon: { position: 'absolute', left: '10px', color: '#9ca3af' },
  
  input: { width: '100%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  inputWithIcon: { width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  inputMultiSelect: { width: '100%', boxSizing: 'border-box', padding: '5px 5px 5px 5px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  disabledInput: { width: '100%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#e5e7eb', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '12px', fontSize: '14px', minHeight: '64px', resize: 'none', marginTop: '8px' },
  startButton: { width: '100%', padding: '16px', backgroundColor: '#08172A', color: '#ffffff', border: 'none', borderRadius: '40px', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },

  inputMultiStyle: { padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', height: '24px', backgroundColor: '#f3f4f6'},
  /*radioFlexStyle: { display: 'flex', flexWrap: 'wrap', gap: '4px' },*/
  radioFlexStyle: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  /*radioBtnStyle: { padding: '0px 6px', borderRadius: '4px', border: '1px solid', fontSize: '14px', fontWeight: '600', height: '20px' },*/
  radioBtnStyle: { padding: '0px 16px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', 
    cursor: 'pointer', textAlign: 'center', minWidth: '60px', transition: 'all 0.2s ease', height: '32px' },
  // 申し送り一覧用
  historyTitle: { fontSize: '24px', fontWeight: 'bold', color: '#08172A', marginBottom: '20px' },
  historyPlaceholder: { backgroundColor: '#ffffff', padding: '20px', borderRadius: '12px', color: '#64748b', fontSize: '14px' },
  historySection: { textAlign: 'center', paddingBottom: '40px' },
  tableHeader: { display: 'flex', backgroundColor: '#f1f5f9', padding: '12px', borderRadius: '8px 8px 0 0', fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  tableBody: { backgroundColor: '#ffffff', borderRadius: '0 0 8px 8px' },
  tableRow: { display: 'flex', padding: '15px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px', alignItems: 'center', color: '#334155' },
  tag: { backgroundColor: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', fontSize: '11px' },
  pagination: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '15px', marginTop: '20px', color: '#64748b', fontSize: '14px' },

  selectorWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  selectorLabel: {
    fontSize: '13px',
    color: '#64748b',
    fontWeight: 'bold'
  },
  selectContainer: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center'
  },
  areaSelect: {
    appearance: 'none',
    backgroundColor: '#ffffff',
    border: '1px solid #cbd5e1',
    borderRadius: '20px',
    padding: '6px 35px 6px 15px',
    fontSize: '14px',
    color: '#334155',
    cursor: 'pointer',
    outline: 'none',
    minWidth: '120px'
  },
  selectIcon: {
    position: 'absolute',
    right: '12px',
    pointerEvents: 'none',
    color: '#64748b'
  },
  pageBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '8px 16px',
    backgroundColor: '#f1f5f9', // 薄いグレー
    border: '1px solid #cbd5e1',
    borderRadius: '6px',
    fontSize: '13px',
    color: '#334155',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    // 常に表示する仕様に合わせ、cursorなどの制御はJSX側のstyle属性で上書きします
  },
  headerCellSortable: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center', // ヘッダーが中央揃えのデザインの場合
    cursor: 'pointer',
    userSelect: 'none', // 文字の誤選択（青反転）を防ぐ
    gap: '2px'
  },
};

const customSelectStyles = {
  // 入力エリア全体（コントロール）のスタイル
  control: (provided, state) => ({
    ...provided,
    backgroundColor: '#f3f4f6',
    border: 'none',
    boxShadow: 'none',
    '&:hover': {
      border: 'none', 
    },
    borderRadius: '8px',
    padding: '2px',
//    height: '32px',
  }),
  // 選択されて中に並ぶ「バッジ（アイテム）」全体のスタイル
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e0e0e0',
    borderRadius: '9999px',
    paddingLeft: '6px',
    paddingRight: '2px',
    border: '1px solid #e5e7eb',
  }),
  // バッジの中の「文字」のスタイル
  multiValueLabel: (provided) => ({
    ...provided,
    color: '#1f2937',
    paddingRight: '4px',
  }),
  // バッジの右側にある「×ボタン」のスタイル
  multiValueRemove: (provided) => ({
    ...provided,
    borderRadius: '0 9999px 9999px 0',
    color: '#9ca3af',
    '&:hover': {
      backgroundColor: '#fee2e2',
      color: '#ef4444',
    },
  }),
  // 2. プレースホルダーのフォントサイズ
  placeholder: (provided) => ({
    ...provided,
    fontSize: '14px',       // 👈 選択前の「車種名を選択」のサイズ
    color: '#9ca3af',
  }),

  // 3. 🔍 選択されたアイテム（確定した文字）のフォントサイズ
  singleValue: (provided) => ({
    ...provided,
    fontSize: '14px',       // 👈 選択した後の「セレナ」などの文字サイズ
    color: '#1f2937',       // 文字色（ダークグレー）
  }),

  // 4. 開いたドロップダウンリスト内のフォントサイズ
  option: (provided, state) => ({
    ...provided,
    fontSize: '14px',       // 👈 リストに並ぶ「セレナ」「ビッツ」のサイズ
    backgroundColor: state.isSelected 
      ? '#73a7fa' 
      : state.isFocused 
        ? '#d3e3fd' 
        : '#ffffff',
    color: state.isSelected ? '#ffffff' : '#1f2937',
    cursor: 'pointer',
  }),
};

export default BriefingView; 

