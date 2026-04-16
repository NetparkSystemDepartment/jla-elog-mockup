import React, { useState } from 'react';
import { Menu, Filter, Calendar, ChevronDown, Download, ChevronLeft, ChevronRight } from 'lucide-react';

function RecordsListView({ onBack, savedRecords = [] }) {
  return (
    <div style={styles.wrapper}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <Menu color="white" size={28} />
        <h1 style={styles.headerTitle}>記録一覧</h1>
        <div style={{ width: 28 }}></div>
      </header>

      <main style={styles.main}>
        <h2 style={styles.pageTitle}>記録一覧</h2>

        {/* 絞り込みパネル */}
        <div style={styles.filterPanel}>
          <div style={styles.filterRow}>
            <Filter size={20} color="#334155" />
            <div style={styles.selectBox}>恩納村 <XIcon /></div>
            <input type="text" placeholder="パトロールメンバー" style={styles.inputMember} />
            <button style={styles.searchBtn}>絞り込み</button>
          </div>
          
          <div style={styles.filterRow}>
            <div style={styles.dateInput}>日付 <Calendar size={14} /></div>
            <span>～</span>
            <div style={styles.dateInput}>日付 <Calendar size={14} /></div>
            <div style={styles.selectBox}>曜日 <ChevronDown size={14} /></div>
            <button style={styles.csvBtn}>
              <Download size={14} /> <u>csv</u>
            </button>
          </div>
        </div>

        {/* テーブルヘッダー（グレー帯） */}
        <div style={styles.tableLabel}>全ての記録一覧</div>
        <div style={styles.tableHeader}>
          <div style={{width: '30px'}}><input type="checkbox" /></div>
          <div style={styles.col}>エリア <UpDownIcon /></div>
          <div style={styles.col}>ビーチ <UpDownIcon /></div>
          <div style={styles.col}>日付 <UpDownIcon /></div>
          <div style={styles.col}>パトロールメンバー</div>
        </div>

        {/* テーブルボディ（データ一覧） */}
        <div style={styles.tableBody}>
          {savedRecords.map((record, index) => (
            <div key={index} style={styles.tableRow}>
              <div style={{width: '30px'}}><input type="checkbox" /></div>
              <div style={styles.col}>恩納村</div>
              <div style={styles.col}>{record.beach}</div>
              <div style={styles.col}>{record.date}</div>
              <div style={styles.colMember}>
                {record.members?.map(m => <div key={m}>@{m}</div>)}
              </div>
            </div>
          ))}
        </div>

        {/* ページネーション */}
        <footer style={styles.tableFooter}>
          <div style={styles.pagination}>
            <ChevronLeft size={20} />
            <span>1/1</span>
            <ChevronRight size={20} />
          </div>
          <button style={styles.historyBtn}>取消履歴を確認する</button>
        </footer>
      </main>
    </div>
  );
}

// 簡易アイコンコンポーネント
const XIcon = () => <span style={{fontSize: '12px', marginLeft: '4px'}}>×</span>;
const UpDownIcon = () => <span style={{fontSize: '10px', marginLeft: '2px'}}>⇅</span>;

const styles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto' },
  header: { backgroundColor: '#0f172a', padding: '15px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { color: 'white', fontSize: '20px', fontWeight: 'bold' },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  pageTitle: { padding: '20px', fontSize: '22px', fontWeight: 'bold', margin: 0 },
  filterPanel: { backgroundColor: 'white', padding: '15px 20px', display: 'flex', flexDirection: 'column', gap: '10px' },
  filterRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  selectBox: { border: '1px solid #cbd5e1', borderRadius: '20px', padding: '4px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', backgroundColor: '#f8fafc' },
  inputMember: { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', flex: 1, backgroundColor: '#f1f5f9' },
  searchBtn: { backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '20px', padding: '8px 20px', fontSize: '13px', fontWeight: 'bold' },
  dateInput: { border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f1f5f9', minWidth: '120px' },
  csvBtn: { background: 'none', border: 'none', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto' },
  tableLabel: { backgroundColor: '#d1d5db', padding: '4px 20px', fontSize: '11px', color: '#475569' },
  tableHeader: { display: 'flex', padding: '12px 20px', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b', fontWeight: 'bold' },
  tableRow: { display: 'flex', padding: '15px 20px', backgroundColor: 'white', borderBottom: '1px solid #f1f5f9', fontSize: '14px', alignItems: 'center' },
  col: { flex: 1 },
  colMember: { flex: 1.5, fontSize: '12px', color: '#334155' },
  tableFooter: { marginTop: 'auto', padding: '15px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'transparent' },
  pagination: { display: 'flex', alignItems: 'center', gap: '15px', color: '#64748b' },
  historyBtn: { background: 'none', border: 'none', color: '#475569', fontSize: '11px', textDecoration: 'underline' }
};

export default RecordsListView;