import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter, Download, Menu } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import Select from 'react-select';
import { getinfoApi, getCsvApi } from '../api/recordApi';
import { useSafeMembers } from '../useSafeMembers';

const PAGE_SIZE = 20;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

const getMasterInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('auth_data') || '{}')?.master_info || {};
  } catch {
    return {};
  }
};

const rowKey = (r) => `${r.key}-${r.detail_key}`;

// startDateは "yyyy/mm/dd" 形式で返ってくるため、<input type="date"> の "yyyy-mm-dd" と
// 区切り文字が異なる。区切り文字違いのまま文字列比較すると常に真/偽に倒れてしまうため、
// 区切り文字を揃えた比較用キーに正規化する。
const startDateKey = (r) => {
  if (!r.startDate) return '';
  const d = new Date(`${String(r.startDate).slice(0, 10).replaceAll('/', '-')}T00:00:00`);
  return isNaN(d.getTime()) ? '' : format(d, 'yyyy-MM-dd');
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

function RecordsListView({ user, onBack, onSelectRecord, selectedKeys, setSelectedKeys }) {
  const isAdmin      = user.kind === 0;
  const canCsvSelect = user.kind <= 2; // admin / patrol / tower

  const [filterArea, setFilterArea]         = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');
  const [filterDow, setFilterDow]           = useState('');
  const [filterMembers, setFilterMembers]   = useState([]);
  const [sortCol, setSortCol]               = useState('startDate');
  const [sortDir, setSortDir]               = useState('desc');
  const [currentPage, setCurrentPage]       = useState(1);
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

  const safeMembers = useSafeMembers();
  const memberOptions = useMemo(() => safeMembers.map(item => {
    const uid = item?.user_id ?? String(item);
    return { value: uid, label: uid };
  }), [safeMembers]);

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
      .filter(r => !filterDateFrom || startDateKey(r) >= filterDateFrom)
      .filter(r => !filterDateTo   || (startDateKey(r) && startDateKey(r) <= filterDateTo))
      .filter(r => !filterDow || String(getDay(new Date(r.startDate))) === filterDow)
      .filter(r => filterMembers.length === 0 ||
        (r.members || []).some(m => filterMembers.includes(m?.user_id ?? String(m))));
  }, [allRecords, showCancelled, filterArea, filterDateFrom, filterDateTo, filterDow, filterMembers]);

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

  const isPageAllSelected = paged.length > 0 && paged.every(r => selectedKeys.has(rowKey(r)));

  const handleSelectAll = (checked) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      paged.forEach(r => checked ? next.add(rowKey(r)) : next.delete(rowKey(r)));
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

  const handleCsvDownload = async () => {
    if (selectedKeys.size === 0) {
      alert('CSV出力する記録にチェックを入れてください');
      return;
    }

    try {
      const targets = sorted.filter(r => selectedKeys.has(rowKey(r)));
      const data = targets.map(r => ({ key: r.key, detail_key: r.detail_key }));
      const blob = await getCsvApi({ type: 4, data });

      // aタグのdownload属性でその場でダウンロードさせる。
      // 新規タブを開くと閉じ忘れが残るため、タブは開かない。
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `elog_${format(new Date(), 'yyyyMMdd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e.message || 'CSV出力に失敗しました');
    }
  };

  const resetPage = () => setCurrentPage(1);

  const handleClearFilters = () => {
    setFilterArea('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterDow('');
    setFilterMembers([]);
    resetPage();
  };

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
                <option key={a.no} value={a.area}>{a.area}</option>
              ))}
            </select>
            <div style={s.inputMember}>
              <Select
                isMulti
                isSearchable
                options={memberOptions}
                value={memberOptions.filter(o => filterMembers.includes(o.value))}
                onChange={(selected) => {
                  setFilterMembers((selected || []).map(o => o.value));
                  resetPage();
                }}
                placeholder="パトロールメンバー"
                noOptionsMessage={() => "見つかりません"}
                styles={customSelectStyles}
                menuPortalTarget={document.body}
                menuPosition="fixed"
              />
            </div>
            <button onClick={resetPage} style={s.searchBtn}>絞り込み</button>
            <button onClick={handleClearFilters} style={s.clearBtn}>クリア</button>
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
                  checked={selectedKeys.has(rowKey(record))}
                  onChange={e => handleSelectRow(rowKey(record), e.target.checked)}
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
  inputMember: { flex: 1, minWidth: '160px' },
  searchBtn: {
    backgroundColor: '#0f172a', color: 'white', border: 'none',
    borderRadius: '20px', padding: '6px 16px', fontSize: '13px',
    fontWeight: 'bold', cursor: 'pointer',
  },
  clearBtn: {
    backgroundColor: '#fff', color: '#475569', border: '1px solid #cbd5e1',
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

const customSelectStyles = {
  // 入力エリア全体（コントロール）のスタイル
  control: (provided) => ({
    ...provided,
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    boxShadow: 'none',
    '&:hover': {
      border: '1px solid #cbd5e1',
    },
    borderRadius: '8px',
    minHeight: 'auto',
  }),
  // 選択されて中に並ぶ「バッジ（アイテム）」全体のスタイル
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e0e0e0',
    borderRadius: '9999px',
    paddingLeft: '6px',
    paddingRight: '2px',
    border: '1px solid #e5e7eb',
    fontSize: '13px',
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
  // プレースホルダーのスタイル
  placeholder: (provided) => ({
    ...provided,
    fontSize: '13px',
    color: '#9ca3af',
  }),
  // 選択肢（オプション）のスタイル
  option: (provided) => ({
    ...provided,
    fontSize: '14px',
  }),
};

export default RecordsListView;
