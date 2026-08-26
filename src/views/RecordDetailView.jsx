import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { getinfoApi, setinfoApi } from '../api/recordApi';
import { useAuth } from '../contexts/authContext';
import { useSafeCarInfo } from '../useSafeCarInfo';
import {
  WEATHER_OPTIONS, TIDE_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS,
  DIRECTIONS, WIND_SPEED_OPTIONS, PRIORITY_OPTIONS, FEATURE_OPTIONS, WIND_SHORE_OPTIONS,
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
// getinfo(type:2/3) は area/beach を「番号」ではなく「名称の文字列」で返してくるため、
// setinfo(type:1)に送る際は名称→noへ逆引きする必要がある
// （RecordsListView.jsxのareaNoOf/beachNoOfと同じ考え方）
const areaNoOf = (areaName, areaList) =>
  areaList.find(a => a.area === areaName)?.no;

const beachNoOf = (areaName, beachName, areaList) => {
  const area = areaList.find(a => a.area === areaName);
  return (area?.beach_info || []).find(b => b.beach === beachName)?.no;
};

/* ---------- 選択肢ラベル取得 ---------- */
const labelOf = (options, id) => {
  if (id === null || id === undefined || id === '') return null;
  const found = options.find(o => String(o.id) === String(id));
  return found?.label ?? null;
};

/* ---------- 表示パーツ ---------- */
/* ログ入力画面(EditView)のボタン選択UIと同じ配色・形状で、非活性の選択済み表示として再現する */

const justifyOf = (align) => align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';

function ValBox({ value, align = 'left' }) {
  const empty = value === null || value === undefined || value === '';
  return (
    <div style={{ ...fs.valBox, justifyContent: justifyOf(align) }}>
      {empty ? <span style={fs.placeholder}>---</span> : value}
    </div>
  );
}

function TwoBox({ left, right, leftAlign = 'left', rightAlign = 'left' }) {
  return (
    <div style={{ display: 'flex', gap: '8px' }}>
      <div style={{ flex: 1, minWidth: 0 }}><ValBox value={left} align={leftAlign} /></div>
      <div style={{ flex: 1, minWidth: 0 }}><ValBox value={right} align={rightAlign} /></div>
    </div>
  );
}

function TextAreaBox({ value }) {
  return <div style={fs.textAreaBox}>{value || 'なし'}</div>;
}

function ChipList({ items, removable = true }) {
  const filtered = (items || []).filter(Boolean);
  if (filtered.length === 0) return <span style={fs.placeholder}>---</span>;
  return (
    <div style={fs.chipRow}>
      {filtered.map((item, i) => (
        <span key={i} style={fs.chip}>{item}{removable && <span style={fs.chipX}>×</span>}</span>
      ))}
    </div>
  );
}

// EditView の radioBtnStyle（未選択/選択）と同じ配色のボタン群を、非活性表示として再現する
function ButtonGroup({ options, value }) {
  const strVal = String(value);
  return (
    <div style={fs.btnRow}>
      {options.map(opt => {
        const sel = String(opt.id) === strVal;
        return (
          <span key={opt.id} style={{ ...fs.btn, ...(sel ? fs.btnSel : {}) }}>
            {opt.label}
          </span>
        );
      })}
    </div>
  );
}

// EditView の「input + 外側ラベル（例: 名）」の見た目に合わせ、単位を値の外側に表示する
function UnitBox({ value, unit, align = 'left' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div style={{ flex: 1, minWidth: 0 }}><ValBox value={value} align={align} /></div>
      {unit && <span style={fs.unitLabel}>{unit}</span>}
    </div>
  );
}

function FourBox({ v1, v2, v3, v4, unit, align = 'left' }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
      <UnitBox value={v1} unit={unit} align={align} /><UnitBox value={v2} unit={unit} align={align} />
      <UnitBox value={v3} unit={unit} align={align} /><UnitBox value={v4} unit={unit} align={align} />
    </div>
  );
}

const hasValue = v => v !== null && v !== undefined && v !== '';

// "HH:MM:SS" 形式で返ってくる場合があるため、他画面(input type="time")と合わせて秒を表示しない
const formatTime = (t) => hasValue(t) ? String(t).slice(0, 5) : null;

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
      <h1 style={ds.headerTitle}>ログ詳細</h1>
      <div style={{ width: 40 }} />
    </header>
  );
}

function RecordDetailView({ user, recordSummary, onBack, onEdit, hideActions = false }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling]         = useState(false);
  const queryClient = useQueryClient();
  const { logout }  = useAuth();
  const safeCarInfo = useSafeCarInfo();

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

  const rawData = apiData?.data ?? null;
  const record = Array.isArray(rawData) ? (rawData[0] ?? null) : rawData;

  const effectiveStartDate = normalizeDate(record?.startDate || recordSummary?.startDate);
  const effectiveArea  = record?.area  ?? recordSummary?.area;
  const effectiveBeach = record?.beach ?? recordSummary?.beach;
  // ログインユーザー（記録担当者）はgetinfo type=2（一覧取得）のlogin_userフィールド
  const effectiveLoginUser = recordSummary?.login_user ?? null;

  // kind: 0=admin 1=パトロール 2=タワー 3=ゲストパトロール 4=ゲストタワー
  // 編集する: adminは常に表示、パトロール/タワーは3日間のみ、ゲストは常に非表示
  // ブリーフィング画面（申し送り一覧）からの遷移では、hideActionsにより
  // 編集する／取消するボタンを常に非表示にする（仕様）
  // canEdit

  const canEdit = (() => {
    if (!record) return false;
    if (record.delete_flg) return false;   // 追加
    if (hideActions) return false;
  // access_typeでの判断に変更
  //  if (user?.kind === 0) return true;
  //  if (user?.kind === 3 || user?.kind === 4) return false;
    if (user?.access_type < 2) return true;
    if (user?.access_type === 3 || user?.access_type === 4) return false;
    if (!effectiveStartDate) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const diffMs = new Date(todayStr).getTime() - new Date(effectiveStartDate).getTime();
    if (isNaN(diffMs)) return false;
    const diffDays = Math.round(diffMs / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  })();

  // 取消する: adminのみ常に表示。パトロール/タワー/ゲストは常に非表示
  // access_typeでの判断に変更
  //const canCancel = !!record && user?.kind === 0 && !hideActions;
  //const canCancel = !!record && user?.kind === 0 && !hideActions && !record.delete_flg;  // 追加
  const canCancel = !!record && user?.access_type === 0 && !hideActions && !record.delete_flg;  // 追加

const handleCancel = async () => {
  setIsCancelling(true);
  try {
    const { members: rawMembers, end_time, ...rest } = record;

    // effectiveArea/effectiveBeach は名称文字列なので、setinfo用に番号へ変換する
    const areaNo  = areaNoOf(effectiveArea, allAreaList);
    const beachNo = beachNoOf(effectiveArea, effectiveBeach, allAreaList);

    // 変換できなかった場合は不正なデータを送信してしまうため、ここで止める
    if (areaNo === undefined || beachNo === undefined) {
      toast.error('エリア・ビーチ情報の取得に失敗しました。画面を開き直してください。');
      return;
    }

    const cancelPayload = {
      ...rest,
      ...(end_time !== undefined ? { endTime: end_time } : {}),
      area: areaNo,
      beach: beachNo,
      startDate: effectiveStartDate,
      members: rawMembers || [],
      delete_flg: true,
    };
      console.log('[cancel payload]', JSON.stringify(cancelPayload, null, 2));
      const result = await setinfoApi({ type: 1, data: cancelPayload });
      console.log('[cancel result]', JSON.stringify(result));

      if (result?.result === false) {
        if (result.error_no === 1001) {
          toast.warning(<div>ログイン情報が確認できません。<br />再ログインして再度取消してください。</div>);
          logout();
          return;
        }
        if (result.error_no === 1002) {
          toast.warning(<div>ログイン情報が不正です。<br />再ログインして再度取消してください。</div>);
          logout();
          return;
        }
        if (result.error_no === 1004) {
          toast.warning(<div>ログインの有効期限が切れました。<br />再ログインして再度取消してください。</div>);
          logout();
          return;
        }
        if (result.error_no === 1005) {
          toast.warning(<div>時間外アクセスエラー。<br />現在の時間帯はシステムをご利用いただけません。</div>);
          return;
        }
        throw new Error(result?.error_msg || '取消失敗');
      }

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

  // ログイン者（記録担当者）は login_user フィールド、members は最初から「自分以外の
  // パトロールメンバー」のみを持つ（membersの先頭がログイン者、という旧仕様の前提は誤りだった）
  const recordOwner   = effectiveLoginUser;
  const otherMembers  = (record.members || []).map(m => m?.user_id ?? String(m));

  // record.carType は車種マスタのインデックス(order)で保存されているため、名称に変換して表示する
  const carTypeLabel = safeCarInfo.find(d => String(d.order) === String(record.carType))?.carType
    ?? record.carType;

  const warnText  = (Array.isArray(record.warn)  ? record.warn  : []).map(String).join('、');
  const alertText = (Array.isArray(record.alert) ? record.alert : []).map(String).join('、');
  const featureItems = (Array.isArray(record.feature) ? record.feature : []).map(f =>
    typeof f === 'number' ? (FEATURE_OPTIONS[f] ?? String(f)) : String(f)
  );

  // upload_file_info の項目名はAPI仕様書で未確定のため、想定されるキー名をフォールバックで拾う
  const uploadedFiles = (Array.isArray(record.upload_file_info) ? record.upload_file_info : []).map(f => ({
    name: f?.fileName ?? f?.file_name ?? f?.name ?? '',
    url: f?.url ?? f?.thumbnail_url ?? f?.path ?? null,
  }));

  // 左右を同じCSS Gridの行として並べることで、内容量が違っても罫線が段ごとに揃うようにする
  // （独立した2本のflex columnだと、行ごとの高さが左右でズレて罫線が噛み合わなくなるため）
  const rows = [
    {
      left:  { label: 'ログインユーザー（記録担当者）', content: <ValBox value={recordOwner} /> },
      right: { label: 'パトロール開始時刻', content: <ValBox value={formatTime(record.startTime)} align="center" /> },
    },
    {
      left:  { label: '自分以外のパトロールメンバー', content: <ChipList items={otherMembers} removable={false} /> },
      right: { label: '天候', content: <ButtonGroup options={WEATHER_OPTIONS} value={record.weather} /> },
    },
    {
      left:  { label: '潮汐', content: <ButtonGroup options={TIDE_OPTIONS} value={record.tide} /> },
      right: { label: '潮流', content: <ButtonGroup options={CURRENT_OPTIONS} value={record.current} /> },
    },
    {
      left:  { label: '満潮時刻・高さ[cm]', content: <TwoBox
        left={formatTime(record.highTideTime)}
        leftAlign="center"
        right={hasValue(record.highTide) ? `${record.highTide} cm` : null}
        rightAlign="right"
      /> },
      right: { label: '波高（アウターリーフ）', content: <ButtonGroup options={WAVE_OPTIONS} value={record.waveOuter} /> },
    },
    {
      left:  { label: '干潮時刻・高さ[cm]', content: <TwoBox
        left={formatTime(record.lowTideTime)}
        leftAlign="center"
        right={hasValue(record.lowTide) ? `${record.lowTide} cm` : null}
        rightAlign="right"
      /> },
      right: { label: '波高（ショアゾーン）', content: <ButtonGroup options={WAVE_OPTIONS} value={record.wave} /> },
    },
    {
      left:  { label: '風速（天気予報）', content: <ButtonGroup options={WIND_SPEED_OPTIONS} value={record.windSpeed} /> },
      right: { label: '風速（現地）', content: <ButtonGroup options={WIND_SPEED_OPTIONS} value={record.windSpeedDetail} /> },
    },
    {
      left:  { label: '風向（天気予報）', content: <ValBox value={labelOf(DIRECTIONS, record.windDir)} /> },
      right: { label: '風向（現地）', content: <ValBox value={labelOf(DIRECTIONS, record.windDirDetail)} /> },
    },
    {
      left:  { label: '注意報', content: <ValBox value={warnText || null} /> },
      right: { label: 'ビーチに対しての風向', content: <ValBox value={labelOf(WIND_SHORE_OPTIONS, record.windShoreDetail)} /> },
    },
    {
      left:  { label: '警報', content: <ValBox value={alertText || null} /> },
      right:  { label: 'ビーチ利用の特徴', content: <ValBox value={featureItems || null} /> },
    },
    {
      left:  { label: '使用車両', content: <TwoBox left={carTypeLabel} right={record.carNo} /> },
      right: { label: '利用者数', content: <UnitBox value={hasValue(record.visitors) ? record.visitors : null} unit="名" align="right" /> },
    },
    {
      left:  { label: 'メモ', highlight: Boolean(record.unpatrolled), content: <TextAreaBox value={record.note} /> },
      right: { label: '注意喚起人数', content: <FourBox
        v1={hasValue(record.jpWarning)  ? record.jpWarning  : null}
        v2={hasValue(record.forWarning) ? record.forWarning : null}
        v3={hasValue(record.jpTourist)  ? record.jpTourist  : null}
        v4={hasValue(record.forTourist) ? record.forTourist : null}
        unit="名"
        align="right"
      /> },
    },
    {
      left:  null,
      right: { label: '申し送り事項（応急手当・救助・その他）', content: <TextAreaBox value={record.handover} /> },
    },
    {
      left:  null,
      right: { label: '優先度', content: <ButtonGroup options={PRIORITY_OPTIONS} value={record.priority} /> },
    },
    {
      left:  null,
      right: { label: 'パトロール終了時刻', content: <ValBox value={formatTime(record.endTime ?? record.end_time)} align="center" /> },
    },
  ];

  // アップロードされた画像: アップロードがある記録のみ表示（ファイル名の下にサムネイル）
  if (uploadedFiles.length > 0) {
    rows.push({
      left: null,
      right: {
        label: 'アップロードされた画像',
        content: (
          <div style={fs.uploadGrid}>
            {uploadedFiles.map((file, i) => (
              <div key={i} style={fs.uploadItem}>
                <div style={fs.uploadName}>{file.name}</div>
                {file.url && <img src={file.url} alt={file.name} style={fs.uploadThumb} />}
              </div>
            ))}
          </div>
        ),
      },
    });
  }

  return (
    <div style={ds.wrapper}>
      {/* ── ヘッダー〜エリア/ビーチ/日付/ボタンは、スクロールしても常に上部に固定表示する ── */}
      <div style={ds.stickyTop}>
        <HeaderBar onBack={onBack} />

        <div style={ds.topSection}>
          <div style={ds.areaText}>{areaName}</div>
          <div style={ds.beachText}>{beachName}</div>
          <div style={ds.dateRow}>
            <span style={ds.dateText}>{dateLabel}　{seqLabel}</span>
            {(canEdit || canCancel) && (
              <div style={ds.actionBtns}>
                {canCancel && <button onClick={() => setShowCancelDialog(true)} style={ds.actionBtn}>取消する</button>}
                {canEdit && <button onClick={() => onEdit(record)} style={ds.actionBtn}>編集する</button>}
              </div>
            )}
          </div>
        </div>

        <div style={ds.divider} />
      </div>

      <main style={ds.main}>
        {/* ── ログ詳細画面レイアウト（画面定義書 準拠）。左右を1つのCSS Gridの行として並べ、罫線を段ごとに揃える ── */}
        <div style={ds.grid}>
          {rows.map((row, i) => {
            const isLastRow = i === rows.length - 1;
            const rowBorder = isLastRow ? {} : fs.rowDivider;
            return (
              <React.Fragment key={i}>
                <div style={{
                  ...fs.cell, ...fs.cellLeft, ...rowBorder,
                  ...(row.left?.highlight ? { backgroundColor: '#ECD283' } : {}),
                }}>
                  {row.left && (<><div style={fs.label}>{row.left.label}</div>{row.left.content}</>)}
                </div>
                <div style={{
                  ...fs.cell, ...rowBorder,
                  ...(row.right?.highlight ? { backgroundColor: '#ECD283' } : {}),
                }}>
                  {row.right && (<><div style={fs.label}>{row.right.label}</div>{row.right.content}</>)}
                </div>
              </React.Fragment>
            );
          })}
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

/* ── フィールドスタイル ──
   ログ入力画面(EditView)と同じ配色を流用し、グレー背景・罫線区切りの見た目を再現する */
const fs = {
  // 行の実体は RecordDetailView の rows.map() 側で2セル(左右)ずつ描画する。
  // 1つの grid に左右を並べることで、内容量が違っても段ごとに罫線が揃う
  cell: { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 },
  cellLeft: { borderRight: '1px solid #e2e8f0' },
  rowDivider: { borderBottom: '1px solid #e2e8f0' },
  label: { fontSize: '12px', fontWeight: 'bold', color: '#334155' },
  // 読み取り専用ボックスは background-color: rgb(229, 231, 235) で塗り、
  // 枠線の代わりに薄い黒(rgba(0,0,0,0.1))のリング状box-shadowで縁取る（border:0）
  valBox: {
    backgroundColor: 'rgb(229, 231, 235)', borderRadius: '8px', border: 0,
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
    padding: '8px 12px', fontSize: '13px', color: '#1e293b',
    minHeight: '36px', display: 'flex', alignItems: 'center',
  },
  textAreaBox: {
    backgroundColor: 'rgb(229, 231, 235)', borderRadius: '8px', border: 0,
    boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)',
    padding: '8px 12px', fontSize: '13px', color: '#1e293b',
    minHeight: '60px', lineHeight: 1.6,
  },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '2px 0' },
  chip: {
    backgroundColor: '#fff', borderRadius: '9999px',
    padding: '4px 6px 4px 10px', fontSize: '13px', color: '#1f2937',
    border: '1px solid #e2e8f0', display: 'inline-flex', alignItems: 'center', gap: '4px',
  },
  chipX: { color: '#9ca3af', fontSize: '12px' },
  placeholder: { fontSize: '13px', color: '#94a3b8' },
  unitLabel: { fontSize: '12px', fontWeight: 'bold', color: '#64748b', flexShrink: 0 },
  uploadGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  uploadItem: { width: '72px' },
  uploadName: { fontSize: '10px', color: '#64748b', wordBreak: 'break-all', marginBottom: '4px' },
  uploadThumb: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' },
  // EditView の radioBtnStyle と同じ配色（未選択: 白地グレー枠 / 選択: 水色枠+淡青地）。
  // 各ボタンは flex:1 で行内を均等割りし、選択肢の文字数に関わらず等幅にする
  btnRow: { display: 'flex', gap: '8px' },
  btn: {
    flex: 1, padding: '4px 6px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '13px', fontWeight: '600', backgroundColor: '#fff', color: '#64748b',
    textAlign: 'center',
  },
  btnSel: { borderColor: '#38bdf8', backgroundColor: '#e0f2fe', color: '#0369a1' },
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
  actionBtn: {
    backgroundColor: '#e5e7eb', color: '#1a1a1a',
    border: 'none', borderRadius: '9999px',
    padding: '8px 20px', fontSize: '13px', cursor: 'pointer',
  },
  divider: { height: '1px', backgroundColor: '#e2e8f0', margin: '0 16px 4px' },
  // ヘッダー〜エリア/ビーチ/日付/ボタンをまとめてスクロール上部に固定する
  stickyTop: { position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' },
  // 画面定義書の通り、背景はグレー・カード枠は使わず罫線区切りの表形式にする。
  // 左右セルを同じgridの行として並べるので、内容量が違っても段ごとに罫線が揃う
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: '#f2f2f2' },
  message: { padding: '40px', textAlign: 'center', color: '#64748b' },
  overlay: {
    position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
  },
  // 画面本体のwrapperとは別階層（フラグメントの兄弟）に描画されるため、フォント指定を継承できず
  // ブラウザ既定フォント（明朝系）になってしまう。ここで明示的に指定する
  dialog: {
    backgroundColor: 'white', borderRadius: '16px',
    padding: '28px 24px', maxWidth: '320px', width: '90%', textAlign: 'center',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
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
