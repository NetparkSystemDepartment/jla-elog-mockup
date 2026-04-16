import React from 'react';
import { ChevronLeft, Printer, Share2 } from 'lucide-react';
import InputTile from '../components/InputTile'; // EditViewと同じものをインポート
import styles from './EditView.module.css'; // スタイルも流用

function RecordDetailView({ record, onBack }) {
  if (!record) return null;

  // EditViewのレイアウトを模倣した表示用コンポーネント
  const DisplayTile = ({ label, icon, value }) => (
    <InputTile label={label} icon={icon}>
      <div style={detailStyles.readOnlyField}>
        {value || '---'}
      </div>
    </InputTile>
  );

  return (
    <div style={detailStyles.wrapper}>
      {/* 共通の濃紺ヘッダー */}
      <header style={detailStyles.header}>
        <button onClick={onBack} style={detailStyles.backBtn}>
          <ChevronLeft color="white" size={24} />
        </button>
        <div style={detailStyles.logoGroup}>
          <div style={detailStyles.logoCircle}></div>
          <h1 style={detailStyles.logoText}>沖縄e-log (詳細)</h1>
        </div>
        <div style={detailStyles.headerIcons}>
          <Printer color="white" size={20} cursor="pointer" />
          <Share2 color="white" size={20} cursor="pointer" />
        </div>
      </header>

      <main style={detailStyles.main}>
        {/* 基本情報（ビーチ名など） */}
        <div style={detailStyles.beachInfo}>
          <h2 style={detailStyles.beachName}>{record.beach}</h2>
          <p style={detailStyles.dateText}>{record.date} の記録</p>
        </div>

        {/* EditViewと同じ2列グリッドレイアウト */}
        <div className={styles.gridContainer}>
          {/* 左列の項目 */}
          <div className={styles.column}>
            <DisplayTile label="天候" value={record.weather} />
            <DisplayTile label="風向" value={record.windDir} />
            <DisplayTile label="風速" value={record.windSpeed} />
            <DisplayTile label="潮汐" value={record.tide} />
            <DisplayTile label="波高" value={record.wave} />
          </div>

          {/* 右列の項目 */}
          <div className={styles.column}>
            <DisplayTile label="利用者数" value={record.visitors} />
            <DisplayTile label="注意喚起" value={record.warnings} />
            <DisplayTile label="清掃状況" value={record.cleaning} />
            {/* 必要に応じて項目を追加 */}
          </div>
        </div>

        {/* 自由記述エリア */}
        <div style={detailStyles.memoSection}>
          <label style={detailStyles.memoLabel}>申し送り・特記事項</label>
          <div style={detailStyles.memoContent}>
            {record.handover || '特になし'}
          </div>
        </div>
      </main>
    </div>
  );
}

const detailStyles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  header: { 
    backgroundColor: '#0f172a', 
    height: '64px', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    padding: '0 20px' 
  },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: '#ffffff', fontSize: '18px', fontWeight: 'bold' },
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  headerIcons: { display: 'flex', gap: '20px' },
  
  main: { padding: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', boxSizing: 'border-box' },
  beachInfo: { marginBottom: '20px', textAlign: 'center' },
  beachName: { fontSize: '24px', fontWeight: 'bold', color: '#0f172a', margin: '0' },
  dateText: { fontSize: '14px', color: '#666', marginTop: '5px' },
  
  // 入力欄と同じ見た目で、編集不可にするためのスタイル
  readOnlyField: {
    padding: '10px 12px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#334155',
    fontWeight: 'bold',
    minHeight: '20px',
    border: '1px solid #e2e8f0'
  },
  
  memoSection: { marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '24px' },
  memoLabel: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '10px' },
  memoContent: { 
    padding: '15px', 
    backgroundColor: '#f3f4f6', 
    borderRadius: '12px', 
    fontSize: '14px', 
    lineHeight: '1.6', 
    whiteSpace: 'pre-wrap' 
  }
};

export default RecordDetailView;