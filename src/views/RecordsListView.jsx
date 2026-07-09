import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter, Download, Menu } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { getinfoApi } from '../api/recordApi';

const PAGE_SIZE = 20;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const getMasterInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('auth_data') || '{}')?.master_info || {};
  } catch {
    return {};
  }
};

const areaLabel = (areaId, areaList) => {
  const found = areaList.find(a => String(a.no) === String(areaId));
  return found?.area ?? String(areaId);
};

const beachLabel = (beachId, areaId, areaList) => {
  const area = areaList.find(a => String(a.no) === String(areaId));
  const beach = (area?.beach_info || []).find(b => String(b.no) === String(beachId));
  return beach?.beach ?? String(beachId);
};

function RecordsListView({ user, onBack, onSelectRecord }) {
  const isAdmin      = user.kind === 0;
  const canCsvSelect = user.kind <= 2; // admin / patrol / tower

  const [filterArea, setFilterArea]         = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [filterDow, setFilterDow]           = useState('');
  const [filterMember, setFilterMember]     = useState('');
  const [sortCol, setSortCol]               = useState('startDate');
  const [sortDir, setSortDir]               = useState('desc');
  const [currentPage, setCurrentPage]       = useState(1);
  const [selectedKeys, setSelectedKeys]     = useState(new Set());
  const [showCancelled, setShowCancelled]   = useState(false);

  const masterInfo  = useMemo(() => getMasterInfo(), []);
  const allAreaList = useMemo(
    () => (masterInfo.area_info || []).filter(a => Number(a.delete_flg) !== 1),
    [masterInfo]
  );

  const areaOptions = useMemo(() => {
    if (user.kind === 1) return allAreaList.filter(a => a.auth_type === 1);
    if (user.kind === 2) return allAreaList.filter(a => a.auth_type === 2);
    return allAreaList;
  }, [allAreaList, user.kind]);

  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['records-list'],
    queryFn: () => getinfoApi({ type: 2 }),
    staleTime: 60_000,
  });

  const allRecords = useMemo(() => apiData?.data || [], [apiData]);

  const filtered = useMemo(() => {
    return allRecords
      .filter(r => Boolean(r.delete_flg) === showCancelled)
      .filter(r => !filterArea || String(r.area) === String(filterArea))
      .filter(r => !filterDateFrom || r.startDate >= filterDateFrom)
      .filter(r => !filterDateTo   || r.startDate <= filterDateTo)
      .filter(r => !filterDow || String(getDay(new Date(r.startDate))) === filterDow)
      .filter(r => !filterMember || (r.members || []).some(m => (m?.user_id ?? String(m)).includes(filterMember)));
  }, [allRecords, showCancelled, filterArea, filterDateFrom, filterDateTo, filterDow, filterMember]);

  const sorted = useMemo(() => {
    if (!sortCol) return filtered;
    return [...filtered].sort((a, b) => {
      const va = String(a[sortCol] ?? '');
      const vb = String(b[sortCol] ?? '');
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const paged      = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSortClick = (col) => {
    if (sortCol !== col) { setSortCol(col); setSortDir('asc'); }
    else if (sortDir === 'asc') setSortDir('desc');
    else setSortCol(null);
    setCurrentPage(1);
  };

  const sortIcon = (col) => {
    if (sortCol !== col) return ' ⇅';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const isPageAllSelected = paged.length > 0 && paged.every(r => selectedKeys.has(r.key));

  const handleSelectAll = (checked) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      paged.forEach(r => checked ? next.add(r.key) : next.delete(r.key));
      return next;
    });
  };

  const handleSelectRow = (key, checked) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      checked ? next.add(key) : next.delete(key);
      return next;
    });
  };

  const handleCsvDownload = () => {
    const targets = selectedKeys.size > 0
      ? sorted.filter(r => selectedKeys.has(r.key))
      : sorted;

    const rows = [
      ['エリア', 'ビーチ', '日付', 'パトロールメンバー'],
      ...targets.map(r => [
        areaLabel(r.area, allAreaList),
        beachLabel(r.beach, r.area, allAreaList),
        r.startDate,
        (r.members || []).map(m => m?.user_id ?? String(m)).join(' / '),
      ]),
    ];
    const csv = rows.map(row =>
      row.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `elog_${format(new Date(), 'yyyyMMdd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetPage = () => setCurrentPage(1);

  return (
    <div style={s.wrapper}>
      <header style={s.header}>
        <div style={s.menuBtn}><Menu color="white" size={22} /></div>
        <h1 style={s.headerTitle}>{showCancelled ? '取消履歴一覧' : 'ログデータ'}</h1>
        <div style={{ width: 40 }} />
      </header>

      <main style={s.main}>
        {/* フィルターパネル */}
        <div style={s.filterPanel}>
          <div style={s.filterRow}>
            <Filter size={16} color="#334155" />
            <select
              value={filterArea}
              onChange={e => { setFilterArea(e.target.value); resetPage(); }}
              style={s.select}
            >
              <option value="">全エリア</option>
              {areaOptions.map(a => (
                <option key={a.no} value={a.no}>{a.area}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="パトロールメンバー"
              value={filterMember}
              onChange={e => setFilterMember(e.target.value)}
              style={s.inputMember}
            />
            <button onClick={resetPage} style={s.searchBtn}>絞り込み</button>
          </div>

          <div style={s.filterRow}>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => { setFilterDateFrom(e.target.value); resetPage(); }}
              style={s.dateInput}
            />
            <span style={{ color: '#64748b' }}>～</span>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => { setFilterDateTo(e.target.value); resetPage(); }}
              style={s.dateInput}
            />
            <select
              value={filterDow}
              onChange={e => { setFilterDow(e.target.value); resetPage(); }}
              style={s.selectSm}
            >
              <option value="">曜日</option>
              {DAY_LABELS.map((d, i) => (
                <option key={i} value={String(i)}>{d}</option>
              ))}
            </select>
            {isAdmin && (
              <button onClick={handleCsvDownload} style={s.csvBtn}>
                <Download size={14} />
                <span style={{ textDecoration: 'underline' }}>csv</span>
              </button>
            )}
          </div>
        </div>

        {/* テーブルラベル */}
        <div style={s.tableLabel}>
          {showCancelled ? '取消履歴' : '全ての記録一覧'}
        </div>

        {/* テーブルヘッダー */}
        <div style={s.tableHeader}>
          {canCsvSelect && (
            <div style={s.checkCell}>
              <input
                type="checkbox"
                checked={isPageAllSelected}
                onChange={e => handleSelectAll(e.target.checked)}
              />
            </div>
          )}
          <div style={{ ...s.col, cursor: 'pointer' }} onClick={() => handleSortClick('area')}>
            エリア{sortIcon('area')}
          </div>
          <div style={{ ...s.col, cursor: 'pointer' }} onClick={() => handleSortClick('beach')}>
            ビーチ{sortIcon('beach')}
          </div>
          <div style={{ ...s.col, cursor: 'pointer' }} onClick={() => handleSortClick('startDate')}>
            日付{sortIcon('startDate')}
          </div>
          <div style={s.colWide}>パトロールメンバー</div>
        </div>

        {isLoading && <div style={s.message}>読み込み中...</div>}
        {error    && <div style={s.message}>データの取得に失敗しました</div>}

        {paged.map(record => (
          <div
            key={`${record.key}-${record.detail_key}`}
            style={s.tableRow}
            onClick={() => onSelectRecord(record)}
          >
            {canCsvSelect && (
              <div style={s.checkCell} onClick={e => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedKeys.has(record.key)}
                  onChange={e => handleSelectRow(record.key, e.target.checked)}
                />
              </div>
            )}
            <div style={s.col}>{areaLabel(record.area, allAreaList)}</div>
            <div style={s.col}>{beachLabel(record.beach, record.area, allAreaList)}</div>
            <div style={s.col}>
              {(() => {
                if (!record.startDate) return '---';
                try {
                  const d = new Date(String(record.startDate).slice(0, 10) + 'T00:00:00');
                  return isNaN(d.getTime()) ? '---' : format(d, 'yyyy/M/d(E)', { locale: ja });
                } catch { return '---'; }
              })()}
            </div>
            <div style={s.colWide}>
              {(record.members || []).map((m, i) => <div key={i}>{m?.user_id ?? String(m)}</div>)}
            </div>
          </div>
        ))}

        {!isLoading && !error && paged.length === 0 && (
          <div style={s.message}>データがありません</div>
        )}

        <div style={s.footer}>
          <div style={s.pagination}>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={s.pageBtn}
            >
              <ChevronLeft size={18} />
            </button>
            <span>{currentPage} / {totalPages}</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={s.pageBtn}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          {isAdmin && (
            <button
              onClick={() => { setShowCancelled(v => !v); resetPage(); setSelectedKeys(new Set()); }}
              style={s.historyBtn}
            >
              {showCancelled ? '通常一覧に戻る' : '取消履歴を確認する'}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}

const s = {
  wrapper: {
    backgroundColor: '#e5e7eb', minHeight: '100dvh', display: 'flex', flexDirection: 'column',
    maxWidth: '820px', margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#0f172a', padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  },
  menuBtn: { padding: '4px', display: 'flex', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 },
  main: { flex: 1, display: 'flex', flexDirection: 'column' },
  filterPanel: {
    backgroundColor: 'white', padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  filterRow: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  select: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px',
    fontSize: '13px', backgroundColor: '#f8fafc',
  },
  selectSm: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px',
    fontSize: '13px', backgroundColor: '#f8fafc', minWidth: '60px',
  },
  inputMember: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 10px',
    fontSize: '13px', flex: 1, backgroundColor: '#f1f5f9',
  },
  searchBtn: {
    backgroundColor: '#0f172a', color: 'white', border: 'none',
    borderRadius: '20px', padding: '6px 16px', fontSize: '13px',
    fontWeight: 'bold', cursor: 'pointer',
  },
  dateInput: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px',
    fontSize: '13px', backgroundColor: '#f1f5f9',
  },
  csvBtn: {
    background: 'none', border: 'none', display: 'flex', alignItems: 'center',
    gap: '4px', fontSize: '13px', cursor: 'pointer', marginLeft: 'auto', color: '#334155',
  },
  tableLabel: { backgroundColor: '#d1d5db', padding: '4px 16px', fontSize: '11px', color: '#475569' },
  tableHeader: {
    display: 'flex', padding: '10px 16px', backgroundColor: '#f1f5f9',
    borderBottom: '1px solid #e2e8f0', fontSize: '12px', color: '#64748b',
    fontWeight: 'bold', alignItems: 'center',
  },
  tableRow: {
    display: 'flex', padding: '14px 16px', backgroundColor: 'white',
    borderBottom: '1px solid #f1f5f9', fontSize: '14px', alignItems: 'center',
    cursor: 'pointer',
  },
  checkCell: { width: '32px', flexShrink: 0 },
  col: { flex: 1, userSelect: 'none' },
  colWide: { flex: 1.5, fontSize: '12px', color: '#334155' },
  message: { padding: '32px', textAlign: 'center', color: '#64748b' },
  footer: {
    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 'auto', marginBottom: '80px',
  },
  pagination: { display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' },
  pageBtn: {
    background: 'none', border: '1px solid #cbd5e1', borderRadius: '6px',
    padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  historyBtn: {
    background: 'none', border: 'none', color: '#475569',
    fontSize: '12px', textDecoration: 'underline', cursor: 'pointer',
  },
};

export default RecordsListView;
