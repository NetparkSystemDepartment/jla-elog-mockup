import React, { useState } from 'react';
import { User, MessageSquare, StickyNote } from 'lucide-react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { WARNING_OPTIONS, ALERT_OPTIONS, TIDE_OPTIONS, WIND_SPEED_OPTIONS } from '../constants';
import { MultiSelectInput } from '../components/MultiSelectInput';

const DIRECTIONS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
const CARTYPE = ['車種Ａ', '車種Ｂ', '車種Ｃ'];

const MEMBERS = ['staff01', 'staff02', 'staff03'];
 


// モックデータ：本来はDBから取得
const MOCK_HANDOVERS = [
  { priority: '高', date: '2025/07/28', beach: '裏真栄田ビーチ', content: 'ハブクラゲの目撃情報あり。防護ネット付近の点検を強化してください。', member: '担当Ａ' },
  { priority: '低', date: '2025/07/27', beach: 'アボガマ', content: '北西の風が強く、離岸流が発生しやすい状況です。', member: '担当Ｂ' },
];

function BriefingView({ user, onComplete, recentHandovers = [] }) {
  const [data, setData] = useState({
    members: '',
    carType: '', carNo: '',
    tide: '', highTideTime: '', highTide: '', lowTideTime: '', lowTide: '',
    warn: '', alert: '', windDir: '', windSpeed: '',
    handoverMemo: '', noteMemo: ''
  });

  // ページネーター用
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const totalPages = Math.ceil(recentHandovers.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  // 表示する分だけを切り出す
  const currentHandovers = recentHandovers.slice(indexOfFirstItem, indexOfLastItem);
  // ページ変更ハンドラー
  const handlePrev = () => setCurrentPage(prev => Math.max(1, prev - 1));
  const handleNext = () => setCurrentPage(prev => Math.min(totalPages, prev + 1));

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('briefing_data', JSON.stringify(data));
    onComplete(data);
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
                <div style={{...briefingStyles.field, minHeight: '96px'}}>
                  <label style={briefingStyles.label}>自分以外の監視員</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                  <MultiSelectInput
                    options={MEMBERS}
                    value={data.members || []}
                    onChange={(next) => setData({ ...data, members: next })}
                    inputStyle={briefingStyles.inputMultiStyle}
                    placeholder="ユーザーID"
                  />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>使用車両</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      list="carType-options"
                      style={briefingStyles.input}
                      value={data.someValue}
                      onChange={(e) => setData({ ...data, carType: e.target.value })}
                      placeholder="車種名"
                    />
                    <datalist id="carType-options">
                      {CARTYPE.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                    <input type="text" placeholder="No." style={briefingStyles.input} maxLength={4} inputMode="numeric"
                      value={data.carNo} onChange={e => setData({...data, carNo: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>注意報</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                  <MultiSelectInput
                    options={WARNING_OPTIONS}
                    value={data.warn || []}
                    onChange={(next) => setData({ ...data, warn: next })}
                    inputStyle={briefingStyles.inputMultiStyle}
                    placeholder="注意報を選択"
                  />
                  </div>
                 </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>警報</label>
                  <div style={briefingStyles.inputMultiSelect}> 
                  <MultiSelectInput
                    options={ALERT_OPTIONS}
                    value={data.alert || []}
                    onChange={(next) => setData({ ...data, alert: next })}
                    inputStyle={briefingStyles.inputMultiStyle}
                    placeholder="警報を選択"
                  />
                  </div>
                </div>
              </div>

              {/* 右列 */}
              <div style={briefingStyles.column}>
                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>潮汐</label>
                  <div style={briefingStyles.radioFlexStyle}>
                    {TIDE_OPTIONS.map(opt => (<button key={opt} type="button" onClick={(e) => setData({...data, tide: opt})} style={{...briefingStyles.radioBtnStyle, backgroundColor: data.tide === opt ? '#e0f2fe' : '#fff', color: data.current === opt ? '#0369a1' : '#64748b', borderColor: data.tide === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>満潮時刻・高さ [cm]</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="time" style={briefingStyles.input}
                      value={data.highTideTime} onChange={e => setData({...data, highTideTime: e.target.value})} />
                    <input type="number" placeholder="高さ [cm]" style={briefingStyles.input}
                      value={data.highTide} onChange={e => setData({...data, highTide: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>干潮時刻・高さ [cm]</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="time" style={briefingStyles.input}
                      value={data.lowTideTime} onChange={e => setData({...data, lowTideTime: e.target.value})} />
                    <input type="number" placeholder="高さ [cm]" style={briefingStyles.input}
                      value={data.lowTide} onChange={e => setData({...data, lowTide: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>風向（方位）</label>
                  <select style={briefingStyles.input} value={data.windDir} onChange={e => setData({...data, windDir: e.target.value})}>
                    <option value="">風向</option>
                    {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>風速（天気予報）</label>
                  <div style={briefingStyles.radioFlexStyle}>
                    {WIND_SPEED_OPTIONS.map(opt => (<button key={opt} type="button" onClick={(e) => setData({...data, windSpeed: opt})} style={{...briefingStyles.radioBtnStyle, backgroundColor: data.windSpeed === opt ? '#e0f2fe' : '#fff', color: data.current === opt ? '#0369a1' : '#64748b', borderColor: data.windSpeed === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
                  </div>
                </div>
              </div>
            </div>

            {/* 再掲：メモエリア */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #f3f4f6', paddingTop: '20px' }}>
              <div style={briefingStyles.field}>
                <label style={briefingStyles.label}>申し送りメモ（申し送り事項に反映する内容を記載）</label>
                <textarea placeholder="100字以内" style={briefingStyles.textarea}
                  value={data.handoverMemo} onChange={e => setData({...data, handoverMemo: e.target.value})} />
              </div>
              <div style={briefingStyles.field}>
                <label style={briefingStyles.label}>特記メモ（特記事項に反映する内容を記載）</label>
                <textarea placeholder="100字以内" style={briefingStyles.textarea}
                  value={data.noteMemo} onChange={e => setData({...data, noteMemo: e.target.value})} />
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
        <select style={briefingStyles.areaSelect}>
          <option value="恩納村">恩納村</option>
        </select>
        <ChevronDown size={16} style={briefingStyles.selectIcon} />
      </div>
    </div>          </div>
          <div style={briefingStyles.tableHeader}>
            <div style={{ flex: 1 }}>優先度</div>
            <div style={{ flex: 1 }}>ビーチ</div>
            <div style={{ flex: 1 }}>日付</div>
            <div style={{ flex: 2 }}>申し送り事項</div>
            <div style={{ flex: 1 }}>パトロールメンバー</div>
          </div>

          <div style={briefingStyles.tableBody}>
            {currentHandovers.map((item, idx) => (
              <div key={idx} style={briefingStyles.tableRow}>
                <div style={{ flex: 1 }}></div>
                <div style={{ flex: 1 }}>{item.beach}</div>
                <div style={{ flex: 1 }}>{item.date}</div>
                <div style={{ flex: 2, fontSize: '12px', textAlign: 'left' }}>{item.handover}</div>
                <div style={{ flex: 1 }}>{item.user_id}</div>
              </div>
            ))}
          </div>

          <div style={briefingStyles.pagination}>
            {/* 前へボタン */}
            <button 
              onClick={handlePrev} 
              disabled={currentPage === 1}
              style={{ 
                ...briefingStyles.pageBtn, 
                opacity: currentPage === 1 ? 0.3 : 1,
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={16} /> 
            </button>

            {/* ページ情報 */}
            <div style={briefingStyles.pageInfo}>
              <strong>{currentPage}</strong> / {totalPages}
            </div>

            {/* 次へボタン */}
            <button 
              onClick={handleNext} 
              disabled={currentPage === totalPages}
              style={{ 
                ...briefingStyles.pageBtn, 
                opacity: currentPage === totalPages ? 0.3 : 1,
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </div>

  );
}

const briefingStyles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto' },
  header: { backgroundColor: '#44445A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' },
  
  container: { flex: 1, padding: '10px 10px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  card: { backgroundColor: '#ffffff', borderRadius: '24px', padding: '30px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '10px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  column: { display: 'flex', flexDirection: 'column', gap: '12px' },
  /*field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', textAlign: 'left' },*/
  field: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '8px', textAlign: 'left' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#374151' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  icon: { position: 'absolute', left: '10px', color: '#9ca3af' },
  
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  inputWithIcon: { width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  inputMultiSelect: { width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '12px', fontSize: '13px', minHeight: '80px', resize: 'none' },
  startButton: { width: '100%', padding: '16px', backgroundColor: '#44445A', color: '#ffffff', border: 'none', borderRadius: '40px', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },

  inputMultiStyle: { padding: '4px', borderRadius: '4px', border: '1px solid #e2e8f0', fontSize: '12px', height: '24px', backgroundColor: '#fcfcfc'},
  /*radioFlexStyle: { display: 'flex', flexWrap: 'wrap', gap: '4px' },*/
  radioFlexStyle: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  /*radioBtnStyle: { padding: '0px 6px', borderRadius: '4px', border: '1px solid', fontSize: '14px', fontWeight: '600', height: '20px' },*/
  radioBtnStyle: { padding: '10px 16px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', minWidth: '60px', transition: 'all 0.2s ease' },
  // 申し送り一覧用
  historyTitle: { fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px' },
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
  },};

export default BriefingView;

//                <div style={briefingStyles.field}>
//                  <label style={briefingStyles.label}>自分以外の監視員2人目</label>
//                  <div style={briefingStyles.inputWrapper}>
//                    <User size={16} style={briefingStyles.icon} />
//                    <input type="text" placeholder="ユーザーID" style={briefingStyles.inputWithIcon}
//                      value={data.member2} onChange={e => setData({...data, member2: e.target.value})} />
//                  </div>
//                </div>

//                    <select style={briefingStyles.input} value={data.carType} onChange={e => setData({...data, carType: e.target.value})}>
//                      <option value="">車種名</option>
//                      {CARTYPE.map(d => <option key={d} value={d}>{d}</option>)}
//                    </select>
