import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { getinfoApi, setinfoApi } from '../api/recordApi';
import {
  WEATHER_OPTIONS, TIDE_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS,
  DIRECTIONS, WIND_SPEED_OPTIONS, WARNING_OPTIONS, ALERT_OPTIONS,
  PRIORITY_OPTIONS, FEATURE_OPTIONS,
} from '../constants';

/* ---------- マスター情報ヘルパー ---------- */
const getMasterInfo = () => {
  try {
    return JSON.parse(localStorage.getItem('auth_data') || '{}')?.master_info || {};
  } catch { return {}; }
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

/* ---------- 選択肢ラベル取得 ---------- */
const labelOf = (options, id) => {
  if (id === null || id === undefined || id === '') return null;
  const found = options.find(o => String(o.id) === String(id));
  return found?.label ?? null;
};

/* ---------- 表示パーツ ---------- */

function FieldLabel({ label }) {
  return <div style={fs.fieldLabel}>{label}</div>;
}

function ValBox({ value }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div style={fs.valBox}>
      {empty ? <span style={fs.placeholder}>---</span> : value}
    </div>
  );
}

function TwoBox({ left, right }) {
  return (
    <div style={{ display: 'flex', gap: '6px' }}>
      <ValBox value={left} /><ValBox value={right} />
    </div>
  );
}

function SelectBox({ value }) {
  return (
    <div style={fs.selectBox}>
      <span>{value || <span style={fs.placeholder}>---</span>}</span>
      <span style={{ color: '#94a3b8', fontSize: '16px' }}>›</span>
    </div>
  );
}

function TextAreaBox({ value }) {
  return <div style={fs.textAreaBox}>{value || 'なし'}</div>;
}

function ChipList({ items }) {
  const filtered = (items || []).filter(Boolean);
  if (filtered.length === 0) return <span style={fs.placeholder}>---</span>;
  return (
    <div style={fs.chipRow}>
      {filtered.map((item, i) => (
        <span key={i} style={fs.chip}>{item}</span>
      ))}
    </div>
  );
}

function RadioDisplay({ options, value }) {
  const strVal = String(value);
  return (
    <div style={fs.radioRow}>
      {options.map(opt => {
        const sel = String(opt.id) === strVal;
        return (
          <span key={opt.id} style={fs.radioItem}>
            <span style={{ ...fs.radioDot, ...(sel ? fs.radioDotSel : fs.radioDotEmp) }} />
            {opt.label}
          </span>
        );
      })}
    </div>
  );
}

function ToggleDisplay({ options, value }) {
  const strVal = String(value);
  return (
    <div style={fs.toggleRow}>
      {options.map(opt => {
        const sel = String(opt.id) === strVal;
        return (
          <span key={opt.id} style={{ ...fs.toggleBtn, ...(sel ? fs.toggleSel : fs.toggleEmp) }}>
            {opt.label}
          </span>
        );
      })}
    </div>
  );
}

function FourBox({ v1, v2, v3, v4 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
      <ValBox value={v1} /><ValBox value={v2} />
      <ValBox value={v3} /><ValBox value={v4} />
    </div>
  );
}

const hasValue = v => v !== null && v !== undefined && v !== '';

const normalizeDate = (dateStr) =>
  String(dateStr || '').slice(0, 10).replace(/\//g, '-');

const safeFormatDate = (dateStr, fmt, opts) => {
  if (!dateStr) return null;
  try {
    const d = new Date(normalizeDate(dateStr) + 'T00:00:00');
    if (!isValid(d)) return null;
    return format(d, fmt, opts);
  } catch { return null; }
};

/* ================================================ */

function HeaderBar({ onBack }) {
  return (
    <header style={ds.header}>
      <button onClick={onBack} style={ds.backBtn}><ChevronLeft color="white" size={24} /></button>
      <h1 style={ds.headerTitle}>記録詳細</h1>
      <div style={{ width: 40 }} />
    </header>
  );
}

function RecordDetailView({ user, recordSummary, onBack, onEdit }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling]         = useState(false);
  const queryClient = useQueryClient();

  const masterInfo  = useMemo(() => getMasterInfo(), []);
  const allAreaList = useMemo(
    () => (masterInfo.area_info || []).filter(a => Number(a.delete_flg) !== 1),
    [masterInfo]
  );

  const { data: apiData, isLoading, error } = useQuery({
    queryKey: ['record-detail', recordSummary?.key, recordSummary?.detail_key],
    queryFn: () => getinfoApi({
      type: 3,
      key: recordSummary.key,
      detail_key: recordSummary.detail_key,
    }),
    enabled: !!recordSummary?.key,
    staleTime: 30_000,
  });

  const rawData = apiData?.data ?? null;
  const record = Array.isArray(rawData) ? (rawData[0] ?? null) : rawData;

  const effectiveStartDate = normalizeDate(record?.startDate || recordSummary?.startDate);
  const effectiveArea  = record?.area  ?? recordSummary?.area;
  const effectiveBeach = record?.beach ?? recordSummary?.beach;

  const canEditOrCancel = (() => {
    if (!record) return false;
    if (user?.kind === 0) return true;
    if (user?.kind === 9) return false;
    if (!effectiveStartDate) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const diffMs = new Date(todayStr).getTime() - new Date(effectiveStartDate).getTime();
    if (isNaN(diffMs)) return false;
    const diffDays = Math.round(diffMs / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  })();

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      const { members: rawMembers, end_time, ...rest } = record;
      const cancelPayload = {
        ...rest,
        ...(end_time !== undefined ? { endTime: end_time } : {}),
        area: effectiveArea,
        beach: effectiveBeach,
        startDate: effectiveStartDate,
        members: (rawMembers || []).map(m => m?.user_id ?? String(m)),
        delete_flg: true,
      };
      console.log('[cancel payload]', JSON.stringify(cancelPayload, null, 2));
      const result = await setinfoApi({ type: 1, data: cancelPayload });
      console.log('[cancel result]', JSON.stringify(result));
      if (!result?.result) throw new Error(result?.error_msg || '取消失敗');
      await queryClient.invalidateQueries({ queryKey: ['records-list'] });
      toast.success('取消が完了しました。');
      onBack();
    } catch (e) {
      toast.error(e?.message || '取消に失敗しました');
    } finally {
      setIsCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div style={ds.wrapper}>
        <HeaderBar onBack={onBack} />
        <div style={ds.message}>読み込み中...</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={ds.wrapper}>
        <HeaderBar onBack={onBack} />
        <div style={ds.message}>データの取得に失敗しました</div>
      </div>
    );
  }

  /* --- 表示用データ変換 --- */
  const areaName  = areaLabel(effectiveArea, allAreaList);
  const beachName = beachLabel(effectiveBeach, effectiveArea, allAreaList);

  const _dateFormatted = safeFormatDate(effectiveStartDate, 'M月d日(E)', { locale: ja });
  const dateLabel = _dateFormatted ? _dateFormatted + 'の記録' : '---';
  const seqLabel = record.detail_key != null
    ? `# ${String(record.detail_key).padStart(2, '0')}`
    : '';

  const memberItems = (record.members || []).map(m => m?.user_id ?? String(m));
  const warnItems   = (Array.isArray(record.warn)    ? record.warn    : []).map(String).filter(s => s && s !== 'なし');
  const alertItems  = (Array.isArray(record.alert)   ? record.alert   : []).map(String).filter(s => s && s !== 'なし');
  const featureItems = (Array.isArray(record.feature) ? record.feature : []).map(f =>
    typeof f === 'number' ? (FEATURE_OPTIONS[f] ?? String(f)) : String(f)
  );

  return (
    <div style={ds.wrapper}>
      <HeaderBar onBack={onBack} />

      <main style={ds.main}>
        {/* ── 上部: エリア / ビーチ / 日付 / ボタン ── */}
        <div style={ds.topSection}>
          <div style={ds.areaText}>{areaName}</div>
          <div style={ds.beachText}>{beachName}</div>
          <div style={ds.dateRow}>
            <span style={ds.dateText}>{dateLabel}　{seqLabel}</span>
            {canEditOrCancel && (
              <div style={ds.actionBtns}>
                <button onClick={() => onEdit(record)} style={ds.editBtn}>編集する</button>
                <button onClick={() => setShowCancelDialog(true)} style={ds.cancelBtn}>取消する</button>
              </div>
            )}
          </div>
        </div>

        <div style={ds.divider} />

        {/* ── 2カラムフォーム ── */}
        <div style={ds.grid}>

          {/* 左カラム */}
          <div style={ds.col}>
            <FieldLabel label="パトロールメンバー" />
            <ChipList items={memberItems} />

            <FieldLabel label="潮汐" />
            {hasValue(record.tide)
              ? <RadioDisplay options={TIDE_OPTIONS} value={record.tide} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="満潮時刻・高さ [cm]" />
            <TwoBox
              left={record.highTideTime}
              right={hasValue(record.highTide) ? `${record.highTide} cm` : null}
            />

            <FieldLabel label="干潮時刻・高さ [cm]" />
            <TwoBox
              left={record.lowTideTime}
              right={hasValue(record.lowTide) ? `${record.lowTide} cm` : null}
            />

            <FieldLabel label="風向（天気予報）" />
            <SelectBox value={labelOf(DIRECTIONS, record.windDir)} />

            <FieldLabel label="風速（天気予報）" />
            {hasValue(record.windSpeed)
              ? <RadioDisplay options={WIND_SPEED_OPTIONS} value={record.windSpeed} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="注意報" />
            <ChipList items={warnItems} />

            <FieldLabel label="警報" />
            <ChipList items={alertItems} />

            <FieldLabel label="車両情報" />
            <TwoBox left={record.carType} right={record.carNo} />

            <FieldLabel label="申し送り事項" />
            <TextAreaBox value={record.handover} />

            <FieldLabel label="優先度" />
            <SelectBox value={labelOf(PRIORITY_OPTIONS, record.priority)} />
          </div>

          {/* 右カラム */}
          <div style={ds.col}>
            <FieldLabel label="パトロール開始時刻" />
            <ValBox value={record.startTime} />

            <FieldLabel label="パトロール終了時刻" />
            <ValBox value={record.endTime ?? record.end_time} />

            <FieldLabel label="天候" />
            {hasValue(record.weather)
              ? <RadioDisplay options={WEATHER_OPTIONS} value={record.weather} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="潮流" />
            {hasValue(record.current)
              ? <ToggleDisplay options={CURRENT_OPTIONS} value={record.current} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="波高（アウターリーフ）" />
            {hasValue(record.waveOuter)
              ? <RadioDisplay options={WAVE_OPTIONS} value={record.waveOuter} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="波高（ショアゾーン）" />
            {hasValue(record.wave)
              ? <RadioDisplay options={WAVE_OPTIONS} value={record.wave} />
              : <span style={fs.placeholder}>---</span>}

            <FieldLabel label="風向（現地）" />
            <SelectBox value={labelOf(DIRECTIONS, record.windDirDetail)} />

            <FieldLabel label="利用者数" />
            <ValBox value={hasValue(record.visitors) ? `${record.visitors} 名` : null} />

            <FieldLabel label="ビーチ利用の特徴" />
            <ChipList items={featureItems} />

            <FieldLabel label="注意喚起人数" />
            <FourBox
              v1={hasValue(record.jpWarning)  ? `${record.jpWarning} 名`  : null}
              v2={hasValue(record.forWarning) ? `${record.forWarning} 名` : null}
              v3={hasValue(record.jpTourist)  ? `${record.jpTourist} 名`  : null}
              v4={hasValue(record.forTourist) ? `${record.forTourist} 名` : null}
            />

            <FieldLabel label="特記事項" />
            <TextAreaBox value={record.note} />
          </div>
        </div>
      </main>

      {/* 取消確認ダイアログ */}
      {showCancelDialog && (
        <div style={ds.overlay}>
          <div style={ds.dialog}>
            <p style={ds.dialogText}>この記録を記録一覧から取り消します。</p>
            <div style={ds.dialogBtns}>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                style={{ ...ds.dialogOkBtn, opacity: isCancelling ? 0.6 : 1 }}
              >
                {isCancelling ? '処理中...' : '取消する'}
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                style={ds.dialogBackBtn}
              >
                もどる
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── フィールドスタイル ── */
const fs = {
  fieldLabel: {
    fontSize: '12px', color: '#64748b',
    marginTop: '14px', marginBottom: '4px',
  },
  valBox: {
    backgroundColor: '#f1f5f9', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: '#1e293b',
    minHeight: '40px', display: 'flex', alignItems: 'center',
  },
  selectBox: {
    backgroundColor: '#f1f5f9', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: '#1e293b',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    minHeight: '40px',
  },
  textAreaBox: {
    backgroundColor: '#f1f5f9', borderRadius: '8px',
    padding: '10px 12px', fontSize: '14px', color: '#1e293b',
    minHeight: '64px', lineHeight: 1.6,
  },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '4px 0' },
  chip: {
    backgroundColor: '#f1f5f9', borderRadius: '9999px',
    padding: '4px 10px', fontSize: '12px', color: '#1e293b',
    border: '1px solid #e2e8f0',
  },
  placeholder: { fontSize: '14px', color: '#94a3b8' },
  radioRow: {
    display: 'flex', flexWrap: 'wrap',
    gap: '6px 10px', padding: '6px 0', alignItems: 'center',
  },
  radioItem: {
    display: 'flex', alignItems: 'center', gap: '4px',
    fontSize: '13px', color: '#1e293b',
  },
  radioDot:    { width: '13px', height: '13px', borderRadius: '50%', display: 'inline-block', flexShrink: 0 },
  radioDotSel: { backgroundColor: '#0f172a', border: 'none' },
  radioDotEmp: { backgroundColor: 'transparent', border: '1.5px solid #94a3b8' },
  toggleRow: { display: 'flex', gap: '6px', padding: '4px 0' },
  toggleBtn:  { padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 'bold' },
  toggleSel:  { backgroundColor: '#0f172a', color: 'white' },
  toggleEmp:  { backgroundColor: '#f1f5f9', color: '#334155' },
};

/* ── レイアウトスタイル ── */
const ds = {
  wrapper: {
    backgroundColor: 'white', minHeight: '100dvh',
    display: 'flex', flexDirection: 'column',
    maxWidth: '820px', margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    backgroundColor: '#0f172a', padding: '12px 16px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    flexShrink: 0,
  },
  backBtn:     { background: 'none', border: 'none', cursor: 'pointer', padding: 0 },
  headerTitle: { color: 'white', fontSize: '18px', fontWeight: 'bold', margin: 0 },
  main:        { flex: 1, paddingBottom: '96px' },
  topSection:  { padding: '14px 16px 12px' },
  areaText:    { fontSize: '13px', color: '#64748b', marginBottom: '2px' },
  beachText:   { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', marginBottom: '10px' },
  dateRow:     { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' },
  dateText:    { fontSize: '14px', color: '#334155' },
  actionBtns:  { display: 'flex', gap: '8px' },
  editBtn: {
    backgroundColor: 'white', color: '#0f172a',
    border: '1.5px solid #0f172a', borderRadius: '9999px',
    padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
  },
  cancelBtn: {
    backgroundColor: 'white', color: '#ef4444',
    border: '1.5px solid #ef4444', borderRadius: '9999px',
    padding: '6px 16px', fontSize: '13px', cursor: 'pointer',
  },
  divider: { height: '1px', backgroundColor: '#e2e8f0', margin: '0 16px 4px' },
  grid:    { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 14px', padding: '0 16px', alignItems: 'start' },
  col:     { display: 'flex', flexDirection: 'column' },
  message: { padding: '40px', textAlign: 'center', color: '#64748b' },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  dialog: {
    backgroundColor: 'white', borderRadius: '16px',
    padding: '28px 24px', maxWidth: '320px', width: '90%', textAlign: 'center',
  },
  dialogText: { marginBottom: '20px', fontSize: '15px', lineHeight: 1.6 },
  dialogBtns: { display: 'flex', gap: '12px', justifyContent: 'center' },
  dialogOkBtn: {
    padding: '10px 24px', border: '1.5px solid #ef4444', borderRadius: '9999px',
    backgroundColor: 'white', color: '#ef4444',
    cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
  },
  dialogBackBtn: {
    padding: '10px 24px', border: '1.5px solid #cbd5e1', borderRadius: '9999px',
    backgroundColor: '#f1f5f9', color: '#334155',
    cursor: 'pointer', fontSize: '14px',
  },
};

export default RecordDetailView;
