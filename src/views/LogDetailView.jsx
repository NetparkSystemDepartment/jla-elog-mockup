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

function LogDetailView({ user, recordSummary, onBack, onEdit }) {
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
  const canEdit = (() => {
    if (!record) return false;
    if (user?.kind === 0) return true;
    if (user?.kind === 3 || user?.kind === 4) return false;
    if (!effectiveStartDate) return false;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const diffMs = new Date(todayStr).getTime() - new Date(effectiveStartDate).getTime();
    if (isNaN(diffMs)) return false;
    const diffDays = Math.round(diffMs / 86400000);
    return diffDays >= 0 && diffDays <= 2;
  })();

  // 取消する: adminのみ常に表示。パトロール/タワー/ゲストは常に非表示
  const canCancel = !!record && user?.kind === 0;

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      // membersはgetinfoが返す{id, user_id}のオブジェクト配列のまま送る（文字列への変換はしない）
      const { members: rawMembers, end_time, ...rest } = record;
      const cancelPayload = {
        ...rest,
        ...(end_time !== undefined ? { endTime: end_time } : {}),
        area: effectiveArea,
        beach: effectiveBeach,
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
      left:  { label: '自分以外のパトロールメンバー', content: <ChipList items={otherMembers} /> },
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
      right: { label: '利用者数', content: <UnitBox value={hasValue(record.visitors) ? record.visitors : null} unit="名" align="right" /> },
    },
    {
      left:  { label: '使用車両', content: <TwoBox left={carTypeLabel} right={record.carNo} /> },
      right: { label: 'ビーチ利用の特徴', content: <ChipList items={featureItems} removable={false} /> },
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
    <div style={container}>
    <div className="notranslate">
      <header>

        <div style={headerTopStyle}>
          <button onClick={onBack} style={{...logoTextStyle, backgroundColor: "#08172A", color: "#FFFFFF", border: "none"} }>＜</button>
          <span style={logoTextStyle}>ログ編集</span>
          <span></span>
        </div>
        <div style={headerMiddleStyle}>{selectedCoast.name}</div>
        <div style={headerBottomStyle}>
          <h3>{selectedBeach.name}</h3>
          <button onClick={handleSaveClick}
            disabled={isDisabled}
            style={{
              ...saveBtnStyle,
              cursor: isDisabled ? 'not-allowed' : 'pointer' ,
              opacity: isDisabled ? 0.5 : 1,
            }}
           >保存して閉じる</button>
        </div>
        <div style={headerBottomStyle}>
          <span>{formattedDate}の記録 #{String(formData.seq).padStart(2, '0')}</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', alignItems: 'stretch',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
       }}>

        {/* パトロールメンバー */}
        <InputTile label="ログイン者（記録担当者）" icon={User} isExpandable={true} hasValue={Boolean(formData.members && formData.members.length > 0)}>
          {/* ログイン者（記録担当者）を追加 */}
          <div>
            <input
              type="text"
              value={(user.id + user.name) || ''}
              disabled
              style={disabledInput}
            />
          </div>
          <div style={labelBaseStyle}>
            <Users size={12} style={{ marginRight: 4 }} /><label>自分以外のパトロールメンバー</label>
          </div>
          <Select
            isMulti       // 複数選択可能（マルチセレクト）
            isSearchable  // サジェスト検索有効
            hideSelectedOptions={true}
            options={loginOptions}
            value={(formData.members || []).map(item => ({
              value: item,
              label: item?.user_id ?? String(item),
            }))}
            onChange={(selectedOptions) => {
              const nextMembers = (selectedOptions || []).map(option => option.value);
              setFormData({ ...formData, members: nextMembers });
            }}
            // formData.membersは既存データ読み込み時など別インスタンスのオブジェクトになり得るため、
            // 参照一致ではなくidで選択済み判定する（0ddd60e時点の実装踏襲）
            isOptionSelected={(option, selectedValues) => {
              return selectedValues.some(selectedValue => {
                const optionId = option.value?.id ?? option.value;
                const selectedId = selectedValue.value?.id ?? selectedValue.value;
                return optionId === selectedId;
              });
            }}
            placeholder="ユーザーID"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />

        </InputTile>

        {/* パトロール開始時刻、終了時刻、天候　→　終了時刻は画面最下部へ移動 */}
        <InputTile label="パトロール開始時刻"  icon={Clock} isExpandable={true}
          hasValue={(formData.startTime !== '' && formData.startTime !== null && formData.startTime !== undefined)
            && (formData.weather !== '' && formData.weather !== null && formData.weather !== undefined) 
          }
        >
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <input type="time" style={{...inputStyle, width: '40%', ...(errors.startTime ? errorInput : {})}}
              value={formData.startTime} onChange={e => {setFormData({...formData, startTime: e.target.value}); if (errors.startTime) setErrors({ ...errors, startTime: null });}} />
          </div>
          <div style={labelBaseStyle}>
            <Cloud size={12} style={{ marginRight: 4 }} /><label>天候</label>
          </div>
          <div style={radioFlexStyle}>
            {WEATHER_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, weather: opt.id });
                  if (errors.weather) {
                    setErrors({ ...errors, weather: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.weather ? '#ef4444' : (formData.weather === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.weather === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.weather === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 潮汐 */}
        <InputTile label="潮汐" icon={Waves}
          hasValue={formData.tide !== '' && formData.tide !== null && formData.tide !== undefined}
        >
          <div style={radioFlexStyle}>
            {TIDE_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, tide: opt.id });
                  if (errors.tide) {
                    setErrors({ ...errors, tide: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.tide ? '#ef4444' : (formData.tide === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.tide === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.tide === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 潮流 */}
        <InputTile label="潮流" icon={TrendingUpDown}
          hasValue={formData.current !== '' && formData.current !== null && formData.current !== undefined}
        >
          <div style={radioFlexStyle}>
            {CURRENT_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, current: opt.id });
                  if (errors.current) {
                    setErrors({ ...errors, current: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.current ? '#ef4444' : (formData.current === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.current === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.current === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 満潮時国・高さ */}
        <InputTile label="満潮時刻・高さ[cm]" icon={WavesArrowUp}
          hasValue={formData.highTideTime !== '' && formData.highTideTime !== null && formData.highTideTime !== undefined
            && formData.highTide !== '' && formData.highTide !== null && formData.highTide !== undefined}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.highTideTime ? errorInput : {})}}
              value={formData.highTideTime} onChange={e => {setFormData({...formData, highTideTime: e.target.value}); if (errors.highTideTime) setErrors({ ...errors, highTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] "style={{...inputStyle, textAlign: 'right', ...(errors.highTide ? errorInput : {})}}
              value={formData.highTide} onChange={e => {setFormData({...formData, highTide: e.target.value}); if (errors.highTide) setErrors({ ...errors, highTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        </InputTile>

        {/* 波高（アウターリーフ）*/}
        <InputTile label="波高（アウターリーフ）" icon={Activity}
          hasValue={formData.waveOuter !== '' && formData.waveOuter !== null && formData.waveOuter !== undefined}>
          <div style={radioFlexStyle}>
             {WAVE_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, waveOuter: opt.id });
                  if (errors.waveOuter) {
                    setErrors({ ...errors, waveOuter: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.waveOuter ? '#ef4444' : (formData.waveOuter === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.waveOuter === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.waveOuter === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 干潮時刻・高さ */}
        <InputTile label="干潮時刻・高さ[cm]" icon={WavesArrowDown}
          hasValue={formData.lowTideTime !== '' && formData.lowTideTime !== null && formData.lowTideTime !== undefined
            && formData.lowTide !== '' && formData.lowTide !== null && formData.lowTide !== undefined}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.lowTideTime ? errorInput : {})}}
              value={formData.lowTideTime} onChange={e => {setFormData({...formData, lowTideTime: e.target.value}); if (errors.lowTideTime) setErrors({ ...errors, lowTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] "style={{...inputStyle, textAlign: 'right', ...(errors.lowTide ? errorInput : {})}}
              value={formData.lowTide} onChange={e => {setFormData({...formData, lowTide: e.target.value}); if (errors.lowTide) setErrors({ ...errors, lowTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        </InputTile>

        {/* 波高（ショアゾーン） */}
        <InputTile label="波高（ショアゾーン）" icon={Activity}
          hasValue={formData.wave !== '' && formData.wave !== null && formData.wave !== undefined}>
          <div style={radioFlexStyle}>
             {WAVE_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, wave: opt.id });
                  if (errors.wave) {
                    setErrors({ ...errors, wave: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.wave ? '#ef4444' : (formData.wave === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.wave === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.wave === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
           </div>
        </InputTile>

        {/* 風向（天気予報） */}
        <InputTile label="風向（天気予報）" icon={Compass} isExpandable={true}
          hasValue={formData.windDir !== '' && formData.windDir !== null && formData.windDir !== undefined}>
          <select
            value={formData.windDir || ''}
            onChange={e => {
              const val = e.target.value;
              // 選択されたIDを数値に変換して保存（未選択時は空文字）
              setFormData({ ...formData, windDir: val !== '' ? Number(val) : '' });
              if (errors.windDir) setErrors({ ...errors, windDir: null });
            }}
            style={{...inputStyle, ...(errors.windDir ? errorInput : {})}}
           >
            <option value="">ー選択ー</option>
              {DIRECTIONS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
          </select>
        </InputTile>

        {/* 風向（現地） */}
        <InputTile label="風向（現地）" icon={Compass} isExpandable={true}
          hasValue={formData.windDirDetail !== '' && formData.windDirDetail !== null && formData.windDirDetail !== undefined}>
          <select
            value={formData.windDirDetail || ''}
            onChange={e => {
              const val = e.target.value;
              // 選択されたIDを数値に変換して保存（未選択時は空文字）
              setFormData({ ...formData, windDirDetail: val !== '' ? Number(val) : '' });
              if (errors.windDirDetail) setErrors({ ...errors, windDirDetail: null });
            }}
            style={{...inputStyle, ...(errors.windDirDetail ? errorInput : {})}}
          >
            <option value="">ー選択ー</option>
              {DIRECTIONS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
          </select>
        </InputTile>

        {/* 風速（天気予報） */}
        <InputTile label="風速（天気予報）" icon={Gauge}
          hasValue={formData.windSpeed !== '' && formData.windSpeed !== null && formData.windSpeed !== undefined}>
          <div style={radioFlexStyle}>
            {WIND_SPEED_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, windSpeed: opt.id });
                  if (errors.windSpeed) {
                    setErrors({ ...errors, windSpeed: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.windSpeed ? '#ef4444' : (formData.windSpeed === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.windSpeed === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.windSpeed === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 風速（現地） */}
        <InputTile label="風速（現地）" icon={Gauge}
          hasValue={formData.windSpeedDetail !== '' && formData.windSpeedDetail !== null && formData.windSpeedDetail !== undefined}>
          <div style={radioFlexStyle}>
            {WIND_SPEED_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, windSpeedDetail: opt.id });
                  if (errors.windSpeedDetail) {
                    setErrors({ ...errors, windSpeedDetail: null });
                  }
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.windSpeedDetail ? '#ef4444' : (formData.windSpeedDetail === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.windSpeedDetail === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.windSpeedDetail === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 注意報 */}
        <InputTile label="注意報" icon={TriangleAlert} isExpandable={true}
          hasValue={Boolean(formData.warn && formData.warn.length > 0)}
        >
          <Select
            isMulti       // 複数選択可能（マルチセレクト）
            isSearchable={false}   // サジェスト検索有効
            options={warningOptions}
            value={(formData.warn || []).map(item => ({ value: item, label: item }))}
            onChange={(selectedOptions) => {
              // react-select から渡されるオブジェクト配列を、単純な文字列の配列に変換
              const currentValues = (selectedOptions || []).map(option => option.value);

              let updatedValues = currentValues;

              // 直前の状態（data.warn）と現在の状態を比較して、何が「新しく追加されたか」を判定
              const prevValues = formData.warn || [];
              const addedValue = currentValues.find(val => !prevValues.includes(val));

              if (addedValue === 'なし') {
                // 「なし」が新しく選ばれたら、他の選択をすべてクリアして「なし」だけにする
                updatedValues = ['なし'];
              } else if (currentValues.includes('なし') && currentValues.length > 1) {
              // 「なし」以外の項目が新しく選ばれたら、リストから「なし」を削除する
                updatedValues = currentValues.filter(val => val !== 'なし');
              }

              setFormData({ ...formData, warn: updatedValues });
            }}
            placeholder="注意報"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />

        </InputTile>

        {/* ビーチ利用の特徴 */}
        <InputTile label="ビーチ利用の特徴" icon={WavesLadder} isExpandable={true}
          hasValue={Boolean(formData.feature && formData.feature.length > 0)}
        >
          <Select
            isMulti       // 複数選択可能（マルチセレクト）
            isSearchable={false}   // サジェスト検索有効
            options={featureOptions}
            value={(formData.feature || []).map(item => ({ value: item, label: item }))}
            onChange={(selectedOptions) => {
              const nextMembers = (selectedOptions || []).map(option => option.value);
              setFormData({ ...formData, feature: nextMembers });
            }}
            placeholder=""
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />
        </InputTile>

        {/* 警報 */}
        <InputTile label="警報" icon={CircleAlert} isExpandable={true}
          hasValue={Boolean(formData.alert && formData.alert.length > 0)}
        >
          <Select
            isMulti       // 複数選択可能（マルチセレクト）
            isSearchable={false}  // サジェスト検索有効
            options={alertOptions}
            value={(formData.alert || []).map(item => ({ value: item, label: item }))}
            onChange={(selectedOptions) => {
              // react-select から渡されるオブジェクト配列を、単純な文字列の配列に変換
              const currentValues = (selectedOptions || []).map(option => option.value);

              let updatedValues = currentValues;

              // 直前の状態（data.warn）と現在の状態を比較して、何が「新しく追加されたか」を判定
              const prevValues = formData.alert || [];
              const addedValue = currentValues.find(val => !prevValues.includes(val));

              if (addedValue === 'なし') {
                // 「なし」が新しく選ばれたら、他の選択をすべてクリアして「なし」だけにする
                updatedValues = ['なし'];
              } else if (currentValues.includes('なし') && currentValues.length > 1) {
              // 「なし」以外の項目が新しく選ばれたら、リストから「なし」を削除する
                updatedValues = currentValues.filter(val => val !== 'なし');
              }

              setFormData({ ...formData, alert: updatedValues });
            }}
            placeholder="警報"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />
        </InputTile>

        {/* 注意喚起人数 */}
        <InputTile label="注意喚起人数" icon={Megaphone} isExpandable={true}
          hasValue={formData.jpWarning !== '' && formData.jpWarning !== null && formData.jpWarning !== undefined
            && formData.forWarning !== '' && formData.forWarning !== null && formData.forWarning !== undefined
            && formData.jpTourist !== '' && formData.jpTourist !== null && formData.jpTourist !== undefined
            && formData.forTourist !== '' && formData.forTourist !== null && formData.forTourist !== undefined}
        >
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
            <label style={labelLeftyStyle}>日本人県内在住</label>
            <label style={labelLeftyStyle}>外国人県内在住</label>
          </div>
          <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.jpWarning ? errorInput : {})}}
              value={formData.jpWarning}
              onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, jpWarning: val === '' ? '' : Number(val)});
              if (errors.jpWarning) setErrors({ ...errors, jpWarning: null });}} />
            <label style={unitTextStyle}>名</label>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.forWarning ? errorInput : {})}}
              value={formData.forWarning}
              onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, forWarning: val === '' ? '' : Number(val)});
              if (errors.forWarning) setErrors({ ...errors, forWarning: null });}} />
            <label style={unitTextStyle}>名</label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
            <label style={labelLeftyStyle}>日本人観光客</label>
            <label style={labelLeftyStyle}>外国人観光客</label>
          </div>
          <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.jpTourist ? errorInput : {})}}
              value={formData.jpTourist}
              onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, jpTourist: val === '' ? '' : Number(val)});
              if (errors.jpTourist) setErrors({ ...errors, jpTourist: null });}} />
            <label style={unitTextStyle}>名</label>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.forTourist ? errorInput : {})}}
              value={formData.forTourist}
              onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, forTourist: val === '' ? '' : Number(val)});
              if (errors.forTourist) setErrors({ ...errors, forTourist: null });}} />
            <label style={unitTextStyle}>名</label>
          </div>
        </InputTile>

        {/* 車両情報、申し送り事項　→　使用車両に変更 */}
        <InputTile label="使用車両" icon={Car} isExpandable={true}
          hasValue={formData.carType !== '' && formData.carType !== null && formData.carType !== undefined
            && formData.carNo !== '' && formData.carNo !== null && formData.carNo !== undefined}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
                style={{...inputStyle, ...(errors.carType ? errorInput : {})}}
                 value={formData.carType || ''}
                 onChange={e => {
                   // 選択されたIDを数値に変換して保存（未選択時は空文字）
                   const val = e.target.value;
                   setFormData({ ...formData, carType: val !== '' ? Number(val) : '' });
                    if (errors.carType) {
                      setErrors({ ...errors, carType: null });
                    }
                 }}
             >
               <option value="">車種名</option>
               {safeCarInfo.map(d => (
                 <option key={d.order} value={d.order}>
                 {d.carType}
                 </option>
                ))}
             </select>
             <input type="text" placeholder="No." inputMode="numeric" maxLength={4} style={{...inputStyle, ...(errors.carNo ? errorInput : {})}}
              value={formData.carNo}
              onChange={e => {setFormData({...formData, carNo: e.target.value = e.target.value.replace(/[^0-9]/g, "")});
                if (errors.carNo) setErrors({ ...errors, carNo: null });}} />
          </div>
        </InputTile>

        {/* 利用者数 */}
        <InputTile label="利用者数" icon={Users}
          hasValue={formData.visitors !== '' && formData.visitors !== null && formData.visitors !== undefined}
        >
          <div style={inputFlexStyle}>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.visitors ? errorInput : {})}}
              value={formData.visitors}
              onChange={e => {
                              const val = e.target.value;
                              setFormData({...formData, visitors: val === '' ? '' : Number(val)});
              if (errors.visitors) setErrors({ ...errors, visitors: null });}} />
            <label style={unitTextStyle}>名</label>
          </div>
        </InputTile>

        {/* 特記事項（応急手当・救助・その他）　→　メモに変更 */}
          <InputTile label="メモ" icon={NotebookPen} isExpandable={true} backgroundColor={formData.unpatrolled ? '#ECD283' : '#fff'}
            hasValue={!formData.unpatrolled && formData.note !== '' && formData.note !== null && formData.note !== undefined}
          >
          <textarea
            value={formData.note}
            maxLength={100}
            onChange={(e) => {
              setFormData({...formData, note: e.target.value});
              if (errors.note) {
                setErrors({ ...errors, note: null });
              }
            }}
            style={{...inputNoteStyle, ...(errors.note ? errorInput : {})}} />
            <div style={{
              right: '12px',
              bottom: '8px',
              fontSize: '10px',
              color: formData.note.length >= 100 ? '#ef4444' : '#64748b', // 100文字に達したら赤くする
              fontWeight: formData.note.length >= 100 ? 'bold' : 'normal',
              userSelect: 'none',
              textAlign: 'right'
              }}>
              {formData.note.length} / 100
            </div>
        </InputTile>

        <InputTile label="申し送り事項（応急手当・救助・その他）" icon={HandHelping} isExpandable={true}
          hasValue={(formData.handover !== '' && formData.handover !== null && formData.handover !== undefined)
          }
        >
          <textarea
            value={formData.handover}
            maxLength={100}
            onChange={(e) => {
              setFormData({...formData, handover: e.target.value});
              if (errors.handover) {
                setErrors({ ...errors, handover: null });
              }
            }}
            style={{...inputNoteStyle, ...(errors.handover ? errorInput : {})}} />
            <div style={{
              right: '12px',
              bottom: '8px',
              fontSize: '10px',
              color: formData.handover.length >= 100 ? '#ef4444' : '#64748b', // 100文字に達したら赤くする
              fontWeight: formData.handover.length >= 100 ? 'bold' : 'normal',
              userSelect: 'none',
              textAlign: 'right'
              }}>
              {formData.handover.length} / 100
            </div>

          <div style={labelBaseStyle}>
            <Flag size={12} style={{ marginRight: 4 }} /><label>優先度</label>
          </div>
          <div style={radioFlexStyle}>
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.id} // keyには一意のidを指定
                type="button" // フォームの意図しない送信を防ぐために明示
                onClick={() => {
                  // idを状態（formData）に保存
                  setFormData({ ...formData, priority: opt.id });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: formData.priority === opt.id ? '#38bdf8' : '#e2e8f0',
                  backgroundColor: formData.priority === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.priority === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label} {/* 画面表示はlabelを使用 */}
              </button>
            ))}
          </div>
        </InputTile>

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
        </InputTile>

        {/* 画像のアップロード */}
        <InputTile label="画像のアップロード" icon={FileUp} isExpandable={true}>
        </InputTile>

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
        </InputTile>

        {/* パトロール終了時刻 */}
        <InputTile label="パトロール終了時刻" icon={Clock} isExpandable={true}
          hasValue={formData.endTime !== '' && formData.endTime !== null && formData.endTime !== undefined}
        >
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <input type="time" style={{...inputStyle, width: '40%', ...(errors.endTime ? errorInput : {})}}
              value={formData.endTime} onChange={e => {setFormData({...formData, endTime: e.target.value}); if (errors.endTime) setErrors({ ...errors, endTime: null });}} />
          </div>
        </InputTile>

      </main>

      <footer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>

          {/* ログ編集画面はUnpatrolledボタンはなし
          <button
            type="button"
            onClick={handleToggle}
            style={{...unpatrolledBtnStyle, backgroundColor: formData.unpatrolled ? '#ECD283' : '#cccccc',}}>
            Unpatrolled
          </button>
          */}

          {/* ログ編集画面は送信ボタンはなし
          <button
            onClick={() => handleSendClick(formData)}
            disabled={isDisabled}
            style={{
              ...sendBtnStyle,
              cursor: isDisabled ? 'not-allowed' : 'pointer' ,
              opacity: isDisabled ? 0.5 : 1,
            }}
          >
          <span style={{ marginTop: 4}}>{isDisabled ? ( <Ban size={14} style={{ marginRight: 8}} />) : ('')}</span>
          <span>送信</span></button>
          */}
        </div>
      </footer>

    </div>
    </div>
  );
};

const container = { maxWidth: '820px', margin: '0 auto', width: '100%', minHeight: '100dvh', position: 'relative', backgroundColor: '#f1f5f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};
const headerTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px', margin: '0px 8px 0px 8px', backgroundColor: '#08172A' };
const headerMiddleStyle = { display: 'flex', alignItems: 'center', height: '20px', margin: '0px 8px 0px 8px' };
const headerBottomStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '30px', margin: '0px 8px 0px 8px' };
const disabledInput = { width: '50%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed', color: '#000000',
    webkitTextFillColor: '#000000', opacity: '1'
   };
const saveBtnStyle = { margintop: '8px', padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', height: '36px', width: '128px'};
const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
const radioBtnStyle = { padding: '4px 10px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', minWidth: '60px', transition: 'all 0.2s ease' };
const inputFlexStyle = { display: 'flex', flexWrap: 'noWrap', gap: '4px' };
const logoTextStyle = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' };
const inputNarrowStyle = { width: '100%', padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', backgroundColor: '#f3f4f6', textAlign: 'right' };
const inputNoteStyle = { padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', minHeight: '60px', backgroundColor: '#f3f4f6', resize: 'none', fieldSizing: 'content' };
const unitTextStyle = { fontSize: '11px', fontWeight: 'bold', paddingTop: '8px', color: '#64748b', width: '10%', };
const unpatrolledBtnStyle = { padding: '4px 8px', backgroundColor: '#cccccc',  color: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '14px', width: '128px', height: '36px', marginLeft: '8px' };
const sendBtnStyle = { padding: '4px 8px', backgroundColor: '#08172A', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '16px', width: '128px', height: '36px', marginRight: '8px', textAlign: 'center' };
const errorInput = { borderColor: '#ef4444', backgroundColor: '#fef2f2' };
const labelBaseStyle = { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center' };
const labelLeftyStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textalign: 'left', width: '50%' };

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
  }),
  // 選択されて中に並ぶ「バッジ（アイテム）」全体のスタイル
  multiValue: (provided) => ({
    ...provided,
    backgroundColor: '#e0e0e0',
    borderRadius: '9999px',
    paddingLeft: '6px',
    paddingRight: '2px',
    border: '1px solid #e5e7eb',
    fontSize: '14px',
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
    fontSize: '11px',
    color: '#9ca3af',
  }),
  // 選択肢（オプション）のスタイル
  option: (provided, state) => ({
    ...provided,
    fontSize: '14px',
  }),
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

export default LogDetailView;
