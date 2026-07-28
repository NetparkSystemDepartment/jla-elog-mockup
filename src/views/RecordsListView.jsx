import React, { useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Filter, Download, Menu } from 'lucide-react';
import { format, getDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import Select from 'react-select';
import { getinfoApi, getCsvApi } from '../api/recordApi';
import { useSafeMembers } from '../useSafeMembers';
import { useAuth } from '../contexts/authContext';

const PAGE_SIZE = 20;
const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
// 取消履歴一覧はまだリリースしないため、ボタンは表示したまま画面遷移だけ無効化する
const CANCEL_HISTORY_RELEASED = false;

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

// record.area/record.beach はエリア名/ビーチ名の文字列で返るため、
// デフォルトソート用のarea_no/beach_noは名前で引き当てて取得する
const areaNoOf = (r, areaList) => areaList.find(a => a.area === r.area)?.no;
const beachNoOf = (r, areaList) => {
  const area = areaList.find(a => a.area === r.area);
  return (area?.beach_info || []).find(b => b.beach === r.beach)?.no;
};

// デフォルトソート: 日付降順(新しい順) → エリア(area_no) → ビーチ(beach_no) → 情報詳細キー(detail_key)
const makeDefaultCompare = (areaList) => (a, b) => {
  const da = startDateKey(a), db = startDateKey(b);
  if (da !== db) return da < db ? 1 : -1;

  const aAreaNo = Number(areaNoOf(a, areaList) ?? 0);
  const bAreaNo = Number(areaNoOf(b, areaList) ?? 0);
  if (aAreaNo !== bAreaNo) return aAreaNo - bAreaNo;

  const aBeachNo = Number(beachNoOf(a, areaList) ?? 0);
  const bBeachNo = Number(beachNoOf(b, areaList) ?? 0);
  if (aBeachNo !== bBeachNo) return aBeachNo - bBeachNo;

  return Number(a.detail_key ?? 0) - Number(b.detail_key ?? 0);
};

// 検索条件はApp.jsx側で保持する（ログ詳細画面との行き来で条件を保持し、
// フッターの「ログデータ」メニューから入った時だけ初期化するため、このコンポーネント内には持たない）
function RecordsListView({
  user, onBack, onSelectRecord, selectedKeys, setSelectedKeys,
  filterAreas, setFilterAreas,
  filterDateFrom, setFilterDateFrom,
  filterDateTo, setFilterDateTo,
  filterDow, setFilterDow,
  filterMembers, setFilterMembers,
  draftAreas, setDraftAreas,
  draftDateFrom, setDraftDateFrom,
  draftDateTo, setDraftDateTo,
  draftDow, setDraftDow,
  draftMembers, setDraftMembers,
  sortCol, setSortCol,
  sortDir, setSortDir,
  currentPage, setCurrentPage,
  showCancelled, setShowCancelled,
}) {
  const isAdmin      = user.kind === 0;
  const canCsvSelect = user.kind <= 2; // admin / patrol / tower
  const { logout }   = useAuth();

  const masterInfo  = useMemo(() => getMasterInfo(), []);
  const allAreaList = useMemo(
    () => (masterInfo.area_info || []).filter(a => Number(a.delete_flg) !== 1),
    [masterInfo]
  );

  // kind: 0=admin(全エリア) 1=パトロール 2=タワー 3=パトロールゲスト 4=タワーゲスト
  // パトロール/パトロールゲストは巡回エリア(auth_type===1)、タワー/タワーゲストは常駐エリア(auth_type===2)に絞る
  const areaOptions = useMemo(() => {
    if (user.kind === 1 || user.kind === 3) return allAreaList.filter(a => a.auth_type === 1);
    if (user.kind === 2 || user.kind === 4) return allAreaList.filter(a => a.auth_type === 2);
    return allAreaList;
  }, [allAreaList, user.kind]);

  // getinfo API はレコードの area をエリア番号ではなくエリア名の文字列で返すため、
  // 絞り込みもエリア名で一致させる（setinfo 登録時の area はエリア番号なので型が異なる点に注意）
  const areaSelectOptions = useMemo(
    () => areaOptions.map(a => ({ value: a.area, label: a.area })),
    [areaOptions]
  );

  // ログイン者自身の絞り込みはrequestPayload.membersで常に効いており選択解除できないため、
  // 選べても意味のないログイン者自身は選択肢から外す
  const safeMembers = useSafeMembers();
  const memberOptions = useMemo(() => safeMembers.map(item => {
    const uid = item?.user_id ?? String(item);
    return { value: uid, label: uid };
  }), [safeMembers]);

  // 検索キー（areas/start_date/end_date/weekday/delete_flg/members）をサーバーに渡し、
  // 権限外エリアのデータまでブラウザに取得されないようにする。
  // members は「絞り込みパネルで選ばれている条件」を{id, user_id}形式で列挙する。
  // ログインAPIのmembersは元から{id, user_id}のオブジェクト配列で返るため、
  // 選択中のuser_id文字列と突き合わせてidを引ければ、自分以外のメンバーも列挙できる。
  const requestPayload = useMemo(() => {
    const payload = { type: 2 };

    if (filterMembers.length > 0) {
      const memberObjs = filterMembers
        .map(uid => {
          if (uid === user.user_id) return { id: user.id, user_id: uid };
          const found = safeMembers.find(m => (m?.user_id ?? String(m)) === uid);
          return found ? { id: found.id, user_id: uid } : null;
        })
        .filter(Boolean);
      if (memberObjs.length > 0) payload.members = memberObjs;
    }

    if (filterAreas.length > 0) {
      const areaNos = filterAreas
        .map(name => allAreaList.find(a => a.area === name)?.no)
        .filter(no => no !== undefined && no !== null);
      if (areaNos.length > 0) payload.areas = areaNos;
    }
    if (filterDateFrom) payload.start_date = filterDateFrom;
    if (filterDateTo) payload.end_date = filterDateTo;
    if (filterDow !== '') {
      // filterDow は JS の getDay 準拠（日=0～土=6）、API 側は月=0～日=6 のため変換する
      payload.weekday = (Number(filterDow) + 6) % 7;
    }
    if (showCancelled) payload.delete_flg = true;

    return payload;
  }, [filterMembers, filterAreas, filterDateFrom, filterDateTo, filterDow, showCancelled, allAreaList, safeMembers, user.id, user.user_id]);

  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['records-list', requestPayload],
    queryFn: () => getinfoApi(requestPayload),
    staleTime: 60_000,
  });

  // getinfo はエラー時もHTTP 200でresult:falseを返すため、axiosInstanceの強制ログアウトが
  // 走る前にトーストで理由を表示する（これが無いと「突然ログアウトする」ように見えてしまう）
  useEffect(() => {
    if (apiData?.result !== false) return;
    if (apiData.error_no === 1001) {
      toast.warning(<div>ログイン情報が確認できません。<br />再ログインしてください。</div>);
      logout();
      return;
    }
    if (apiData.error_no === 1002) {
      toast.warning(<div>ログイン情報が不正です。<br />再ログインしてください。</div>);
      logout();
      return;
    }
    if (apiData.error_no === 1004) {
      toast.warning(<div>ログインの有効期限が切れました。<br />再ログインしてください。</div>);
      logout();
      return;
    }
    if (apiData.error_no === 1005) {
      toast.warning(<div>時間外アクセスエラー。<br />現在の時間帯はシステムをご利用いただけません。</div>);
      return;
    }
    toast.error(<div>データの処理中にエラーが発生しました。<br />問題が解決しない場合は、管理者へお問い合わせください。</div>);
  }, [apiData, logout]);

  const allRecords = useMemo(() => apiData?.data || [], [apiData]);

  // パトロールメンバーの絞り込みは、他メンバーの{id, user_id}をサーバーへ送れない制約上、
  // 引き続きクライアント側で行う。記録の担当者はlogin_userフィールドで、それ以外のパトロール
  // メンバーはmembers配列で持つため、両方を見て一致すれば表示する
  const filtered = useMemo(() => {
    return allRecords
      .filter(r => Boolean(r.delete_flg) === showCancelled)
      .filter(r => filterAreas.length === 0 || filterAreas.includes(String(r.area)))
      .filter(r => !filterDateFrom || startDateKey(r) >= filterDateFrom)
      .filter(r => !filterDateTo   || (startDateKey(r) && startDateKey(r) <= filterDateTo))
      .filter(r => !filterDow || String(getDay(new Date(r.startDate))) === filterDow)
      // 複数選択時はAND条件（選択した全員がその記録に含まれている場合のみ表示）
      .filter(r => filterMembers.length === 0 ||
        filterMembers.every(uid =>
          uid === r.login_user ||
          (r.members || []).some(m => (m?.user_id ?? String(m)) === uid)
        ));
  }, [allRecords, showCancelled, filterAreas, filterDateFrom, filterDateTo, filterDow, filterMembers]);

  const sorted = useMemo(() => {
    if (!sortCol) return [...filtered].sort(makeDefaultCompare(allAreaList));
    return [...filtered].sort((a, b) => {
      const va = String(a[sortCol] ?? '');
      const vb = String(b[sortCol] ?? '');
      const cmp = va < vb ? -1 : va > vb ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortCol, sortDir, allAreaList]);

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
      // 1001/1002/1004時のforceLogout()はgetCsvApi内で既に呼ばれているため、ここではトースト表示のみ行う
      if (e.error_no === 1001) {
        toast.warning(<div>ログイン情報が確認できません。<br />再ログインしてください。</div>);
        return;
      }
      if (e.error_no === 1002) {
        toast.warning(<div>ログイン情報が不正です。<br />再ログインしてください。</div>);
        return;
      }
      if (e.error_no === 1004) {
        toast.warning(<div>ログインの有効期限が切れました。<br />再ログインしてください。</div>);
        return;
      }
      if (e.error_no === 1005) {
        toast.warning(<div>時間外アクセスエラー。<br />現在の時間帯はシステムをご利用いただけません。</div>);
        return;
      }
      toast.error(e.message || 'CSV出力に失敗しました');
    }
  };

  const resetPage = () => setCurrentPage(1);

  // 「絞り込み」ボタン押下時にのみ、入力中の条件を実際のフィルターへ反映する
  const handleSearch = () => {
    setFilterAreas(draftAreas);
    setFilterDateFrom(draftDateFrom);
    setFilterDateTo(draftDateTo);
    setFilterDow(draftDow);
    setFilterMembers(draftMembers);
    resetPage();
  };

  return (
    <div style={s.wrapper}>
      {/* ── ヘッダー〜フィルター〜テーブル見出し行(th相当)までをスクロール上部に固定表示する ── */}
      <div style={s.stickyTop}>
      <header style={s.header}>
        {showCancelled ? (
          <button
            onClick={() => { setShowCancelled(false); resetPage(); setSelectedKeys(new Set()); }}
            style={s.backBtn}
          >
            <ChevronLeft color="white" size={24} />
          </button>
        ) : (
          <div style={s.menuBtn}><Menu color="white" size={22} /></div>
        )}
        <h1 style={s.headerTitle}>{showCancelled ? '取消履歴' : 'ログデータ'}</h1>
        <div style={{ width: 40 }} />
      </header>

        {/* フィルターパネル */}
        {/* 1段目・2段目でアイコン／内容／ボタンの列幅を揃えるため、2行分をまとめて1つのCSS Gridで組む
            （絞り込みボタンとCSVボタンは文字数が違い幅も異なるため、独立したflex行だとメンバー欄と曜日欄の右端が揃わない） */}
        <div style={s.filterPanel}>
          <div style={s.filterGrid}>
            <Filter size={16} color="#334155" style={{ alignSelf: 'center' }} />
            <div style={s.dateGroup}>
              <div style={s.inputArea}>
                <Select
                  isMulti
                  isSearchable
                  options={areaSelectOptions}
                  value={areaSelectOptions.filter(o => draftAreas.includes(o.value))}
                  onChange={(selected) => {
                    setDraftAreas((selected || []).map(o => o.value));
                  }}
                  placeholder="全エリア"
                  noOptionsMessage={() => "見つかりません"}
                  styles={customSelectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </div>
              <div style={s.inputMember}>
                <Select
                  isMulti
                  isSearchable
                  options={memberOptions}
                  value={memberOptions.filter(o => draftMembers.includes(o.value))}
                  onChange={(selected) => {
                    setDraftMembers((selected || []).map(o => o.value));
                  }}
                  placeholder="パトロールメンバー"
                  noOptionsMessage={() => "見つかりません"}
                  styles={customSelectStyles}
                  menuPortalTarget={document.body}
                  menuPosition="fixed"
                />
              </div>
            </div>
            <button onClick={handleSearch} style={s.searchBtn}>絞り込み</button>

            <div />
            <div style={s.dateGroup}>
              <div style={s.dateInputWrap}>
                <input
                  type="date"
                  value={draftDateFrom}
                  onChange={e => setDraftDateFrom(e.target.value)}
                  style={s.dateInput}
                />
                {/* iPadOS SafariのDate inputはネイティブのクリア(×)が無いため、独自にクリアボタンを用意する */}
                {draftDateFrom && (
                  <button
                    type="button"
                    onClick={() => setDraftDateFrom('')}
                    style={s.dateClearBtn}
                    aria-label="開始日をクリア"
                  >
                    ×
                  </button>
                )}
              </div>
              <span style={{ color: '#64748b' }}>～</span>
              <div style={s.dateInputWrap}>
                <input
                  type="date"
                  value={draftDateTo}
                  onChange={e => setDraftDateTo(e.target.value)}
                  style={s.dateInput}
                />
                {draftDateTo && (
                  <button
                    type="button"
                    onClick={() => setDraftDateTo('')}
                    style={s.dateClearBtn}
                    aria-label="終了日をクリア"
                  >
                    ×
                  </button>
                )}
              </div>
              <select
                value={draftDow}
                onChange={e => setDraftDow(e.target.value)}
                style={s.selectSm}
              >
                <option value="">曜日</option>
                {DAY_LABELS.map((d, i) => (
                  <option key={i} value={String(i)}>{d}</option>
                ))}
              </select>
            </div>
            {canCsvSelect ? (
              <button onClick={handleCsvDownload} style={s.csvBtn}>
                <span style={{ textDecoration: 'underline' }}>CSV</span>
                <Download size={14} />
              </button>
            ) : <div />}
          </div>
        </div>

        {/* テーブルラベル */}
        <div style={s.tableLabel}>
          {showCancelled ? '取消履歴一覧' : 'ログデータ一覧'}
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
              <div style={s.checkAllLabel}>全選択</div>
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
      </div>

      <main style={s.main}>
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
              {/* ログイン者(login_user) + 自分以外のパトロールメンバー全員を表示する */}
              {record.login_user && <div>{record.login_user}</div>}
              {(record.members || []).map((m, i) => (
                <div key={i}>{m?.user_id ?? String(m)}</div>
              ))}
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
              onClick={() => {
                if (!CANCEL_HISTORY_RELEASED) return;
                setShowCancelled(v => !v); resetPage(); setSelectedKeys(new Set());
              }}
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
  backBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 },
  // ページング用フローティングフッター(下記footer)の高さ分、最終行が隠れないよう余白を確保する
  main: { flex: 1, display: 'flex', flexDirection: 'column', paddingBottom: '140px' },
  // ヘッダー〜フィルター〜テーブル見出し行(th相当)をスクロール上部に固定する
  stickyTop: { position: 'sticky', top: 0, zIndex: 10 },
  filterPanel: {
    backgroundColor: 'white', padding: '12px 16px',
    display: 'flex', flexDirection: 'column', gap: '8px',
  },
  // アイコン列(16px)／内容列(1fr)／ボタン列(auto)を2段で共有し、内容列の右端（パトロールメンバー／曜日）を揃える
  filterGrid: {
    display: 'grid', gridTemplateColumns: '16px 1fr auto',
    columnGap: '8px', rowGap: '8px', alignItems: 'center',
  },
  dateGroup: { display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 },
  selectSm: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px',
    fontSize: '13px', backgroundColor: '#f8fafc', minWidth: '60px',
  },
  inputArea: { flex: 1, minWidth: '160px' },
  inputMember: { flex: 1, minWidth: '160px' },
  searchBtn: {
    backgroundColor: '#0f172a', color: 'white', border: 'none',
    borderRadius: '20px', padding: '6px 16px', fontSize: '13px',
    fontWeight: 'bold', cursor: 'pointer',
  },
  dateInput: {
    border: '1px solid #cbd5e1', borderRadius: '8px', padding: '6px 8px',
    fontSize: '13px', backgroundColor: '#f1f5f9', flex: 1, minWidth: 0,
  },
  // iPadOS Safariのdate inputにはネイティブのクリア(×)が無いため、隣に独自のクリアボタンを置く
  dateInputWrap: { display: 'flex', alignItems: 'center', gap: '2px', flex: 1, minWidth: 0 },
  dateClearBtn: {
    background: 'none', border: 'none', color: '#94a3b8', fontSize: '16px',
    lineHeight: 1, cursor: 'pointer', padding: '2px 4px', flexShrink: 0,
  },
  csvBtn: {
    background: 'none', border: 'none', display: 'flex', alignItems: 'center',
    gap: '4px', fontSize: '13px', cursor: 'pointer', color: '#334155', flexShrink: 0,
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
  checkCell: { width: '40px', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' },
  checkAllLabel: { fontSize: '9px', color: '#64748b', marginTop: '2px' },
  col: { flex: 1, userSelect: 'none' },
  colWide: { flex: 1.5, fontSize: '12px', color: '#334155' },
  message: { padding: '32px', textAlign: 'center', color: '#64748b' },
  // 常時グローバルフッター(高さ80px)の直上にフロート表示するページングバー
  footer: {
    position: 'fixed', bottom: '80px', left: 0, right: 0,
    maxWidth: '820px', margin: '0 auto',
    padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', backgroundColor: 'white',
    borderTop: '1px solid #d1d5db', zIndex: 20,
  },
  pagination: { display: 'flex', alignItems: 'center', gap: '12px', color: '#64748b' },
  pageBtn: {
    background: 'none', border: 'none',
    padding: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center',
  },
  historyBtn: {
    background: 'none', border: 'none', color: '#475569',
    fontSize: '12px', textDecoration: 'underline', cursor: 'pointer',
  },
};

const customSelectStyles = {
  // menuPortalTarget={document.body} でメニューがDOMツリーの外（body直下）に描画されるため、
  // 画面側のフォント指定を継承できずブラウザ既定フォント（明朝系）になってしまう。
  // ポータルのルートで明示的に指定し、配下のメニュー/選択肢に継承させる
  // zIndexもreact-select既定値のままだと一覧行やフローティングフッターの下に回り込むため、
  // それらより確実に手前に出るよう明示的に指定する
  menuPortal: (provided) => ({
    ...provided,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    zIndex: 9999,
  }),
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
  // ドロップダウン矢印の前にある縦の区切り線は画面定義書に無いため非表示にする
  indicatorSeparator: () => ({ display: 'none' }),
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
