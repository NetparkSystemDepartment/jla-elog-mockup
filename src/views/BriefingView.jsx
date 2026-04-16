import React, { useState } from 'react';
import { User, MessageSquare, StickyNote } from 'lucide-react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const DIRECTIONS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];

// モックデータ：本来はDBから取得
const MOCK_HANDOVERS = [
  { priority: '高', date: '2025/07/28', beach: '裏真栄田ビーチ', content: 'ハブクラゲの目撃情報あり。防護ネット付近の点検を強化してください。', member: '担当Ａ' },
  { priority: '低', date: '2025/07/27', beach: 'アボガマ', content: '北西の風が強く、離岸流が発生しやすい状況です。', member: '担当Ｂ' },
];

function BriefingView({ onComplete }) {
  const [data, setData] = useState({
    member1: '', member2: '',
    carType: '', carNo: '',
    tide: '', highTideTime: '', highTide: '', lowTideTime: '', lowTide: '',
    warn: '', alert: '', windDir: '', windSpeed: '',
    handoverMemo: '', noteMemo: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
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
                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>自分以外の監視員1人目</label>
                  <div style={briefingStyles.inputWrapper}>
                    <User size={16} style={briefingStyles.icon} />
                    <input type="text" placeholder="ユーザーID" style={briefingStyles.inputWithIcon} 
                      value={data.member1} onChange={e => setData({...data, member1: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>自分以外の監視員2人目</label>
                  <div style={briefingStyles.inputWrapper}>
                    <User size={16} style={briefingStyles.icon} />
                    <input type="text" placeholder="ユーザーID" style={briefingStyles.inputWithIcon}
                      value={data.member2} onChange={e => setData({...data, member2: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>使用車両</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" placeholder="車種名" style={briefingStyles.input}
                      value={data.carType} onChange={e => setData({...data, carType: e.target.value})} />
                    <input type="text" placeholder="No." style={briefingStyles.input}
                      value={data.carNo} onChange={e => setData({...data, carNo: e.target.value})} />
                  </div>
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>注意報</label>
                  <input type="text" placeholder="注意報" style={briefingStyles.input}
                    value={data.warn} onChange={e => setData({...data, warn: e.target.value})} />
                </div>

                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>警報</label>
                  <input type="text" placeholder="警報" style={briefingStyles.input}
                    value={data.alert} onChange={e => setData({...data, alert: e.target.value})} />
                </div>
              </div>

              {/* 右列 */}
              <div style={briefingStyles.column}>
                <div style={briefingStyles.field}>
                  <label style={briefingStyles.label}>潮汐</label>
                  <input type="text" placeholder="潮汐" style={briefingStyles.input}
                    value={data.tide} onChange={e => setData({...data, tide: e.target.value})} />
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
                  <input type="text" placeholder="風速" style={briefingStyles.input}
                    value={data.windSpeed} onChange={e => setData({...data, windSpeed: e.target.value})} />
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
            {MOCK_HANDOVERS.map((item, idx) => (
              <div key={idx} style={briefingStyles.tableRow}>
                <div style={{ flex: 1 }}>{item.priority}</div>
                <div style={{ flex: 1 }}>{item.beach}</div>
                <div style={{ flex: 1 }}>{item.date}</div>
                <div style={{ flex: 2, fontSize: '12px', textAlign: 'left' }}>{item.content}</div>
                <div style={{ flex: 1 }}>{item.member}</div>
              </div>
            ))}
          </div>

          <div style={briefingStyles.pagination}>
            <ChevronLeft size={20} color="#64748b" />
            <span>1 / 1</span>
            <ChevronRight size={20} color="#64748b" />
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
  
  container: { flex: 1, padding: '20px 10px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  card: { backgroundColor: '#ffffff', borderRadius: '24px', padding: '30px 20px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginBottom: '40px' },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  column: { display: 'flex', flexDirection: 'column', gap: '12px' },
  field: { display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px', textAlign: 'left' },
  label: { fontSize: '11px', fontWeight: 'bold', color: '#374151' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  icon: { position: 'absolute', left: '10px', color: '#9ca3af' },
  
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  inputWithIcon: { width: '100%', boxSizing: 'border-box', padding: '10px 10px 10px 30px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
  textarea: { width: '100%', boxSizing: 'border-box', padding: '12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '12px', fontSize: '13px', minHeight: '80px', resize: 'none' },
  startButton: { width: '100%', padding: '16px', backgroundColor: '#44445A', color: '#ffffff', border: 'none', borderRadius: '40px', fontSize: '18px', fontWeight: 'bold', marginTop: '20px', cursor: 'pointer' },

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
  }};

export default BriefingView;