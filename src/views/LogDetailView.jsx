import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Cloud, Wind, Users, Gauge, Waves, User, WavesArrowUp, WavesArrowDown,
  Compass, TrendingUpDown, Activity, WavesLadder, Megaphone, NotebookPen, FileUp, Flag,
  HandHelping, Car, CircleAlert, TriangleAlert } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import InputTile from '../components/InputTile';
import { getinfoApi, setinfoApi } from '../api/recordApi';
import { useAuth } from '../contexts/authContext';
import { useSafeCarInfo } from '../useSafeCarInfo';
import {
  WEATHER_OPTIONS, TIDE_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS,
  DIRECTIONS, WIND_SPEED_OPTIONS, PRIORITY_OPTIONS, FEATURE_OPTIONS, WIND_SHORE_OPTIONS,
} from '../constants';

/* ---------- マスター情報ヘルパー（ロジックは変更なし） ---------- */
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

/* ---------- 表示パーツ ----------
   LogEntryView の入力欄（inputStyle: 背景#f3f4f6・枠線なし・角丸8px）と
   同じトーンになるよう配色を揃えた「非活性の値表示」パーツ群。
   InputTile 自体が hasValue で背景をワントーン暗く(#d8d8d8)するので、
   その内側でさらにコントラストが付くよう、こちらは明るいグレーのままにする。 */

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

// LogEntryView の react-select（customSelectStyles.multiValue）のバッジと同じ配色で再現
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

// LogEntryView の radioBtnStyle（未選択/選択）と同じ配色のボタン群を、非活性表示として再現する
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

// LogEntryView の「input + 外側ラベル（例: 名）」の見た目に合わせ、単位を値の外側に表示する
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
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
      <div style={container}>
        <div style={headerTopStyle}>
          <button onClick={onBack} style={{ ...logoTextStyle, backgroundColor: '#08172A', color: '#FFFFFF', border: 'none' }}>＜</button>
          <span style={logoTextStyle}>ログ詳細</span>
          <span></span>
        </div>
        <div style={messageStyle}>読み込み中...</div>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div style={container}>
        <div style={headerTopStyle}>
          <button onClick={onBack} style={{ ...logoTextStyle, backgroundColor: '#08172A', color: '#FFFFFF', border: 'none' }}>＜</button>
          <span style={logoTextStyle}>ログ詳細</span>
          <span></span>
        </div>
        <div style={messageStyle}>データの取得に失敗しました</div>
      </div>
    );
  }

  /* --- 表示用データ変換 --- */
  const areaName  = areaLabel(effectiveArea, allAreaList);
  const beachName = beachLabel(effectiveBeach, effectiveArea, allAreaList);

  const _dateFormatted = safeFormatDate(effectiveStartDate, 'M月d日 (eee)', { locale: ja });
  const dateLabel = _dateFormatted ? `${_dateFormatted}の記録` : '---';
  const seqLabel = record.detail_key != null
    ? `#${String(record.detail_key).padStart(2, '0')}`
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

  return (
    <div style={container}>
    <div className="notranslate">
      <header>
        <div style={headerTopStyle}>
          <button onClick={onBack} style={{ ...logoTextStyle, backgroundColor: '#08172A', color: '#FFFFFF', border: 'none' }}>＜</button>
          <span style={logoTextStyle}>ログ詳細</span>
          <span></span>
        </div>
        <div style={headerMiddleStyle}>{areaName}</div>
        <div style={headerBottomStyle}>
          <h3>{beachName}</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            {canCancel && (
              <button onClick={() => setShowCancelDialog(true)} style={cancelBtnStyle}>取消する</button>
            )}
            {canEdit && (
              <button onClick={() => onEdit(record)} style={editBtnStyle}>編集する</button>
            )}
          </div>
        </div>
        <div style={headerBottomStyle}>
          <span>{dateLabel} {seqLabel}</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', alignItems: 'stretch',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
       }}>

        {/* ログインユーザー（記録担当者） */}
        <InputTile label="ログイン者（記録担当者）" icon={User} hasValue={hasValue(recordOwner)}>
          <ValBox value={recordOwner} />
        </InputTile>

        {/* パトロール開始時刻 */}
        <InputTile label="パトロール開始時刻" icon={Clock} hasValue={hasValue(record.startTime)}>
          <ValBox value={formatTime(record.startTime)} align="center" />
        </InputTile>

        {/* 自分以外のパトロールメンバー */}
        <InputTile label="自分以外のパトロールメンバー" icon={Users} isExpandable={true} hasValue={otherMembers.length > 0}>
          <ChipList items={otherMembers} removable={false} />
        </InputTile>

        {/* 天候 */}
        <InputTile label="天候" icon={Cloud} hasValue={hasValue(record.weather)}>
          <ButtonGroup options={WEATHER_OPTIONS} value={record.weather} />
        </InputTile>

        {/* 潮汐 */}
        <InputTile label="潮汐" icon={Waves} hasValue={hasValue(record.tide)}>
          <ButtonGroup options={TIDE_OPTIONS} value={record.tide} />
        </InputTile>

        {/* 潮流 */}
        <InputTile label="潮流" icon={TrendingUpDown} hasValue={hasValue(record.current)}>
          <ButtonGroup options={CURRENT_OPTIONS} value={record.current} />
        </InputTile>

        {/* 満潮時刻・高さ */}
        <InputTile label="満潮時刻・高さ[cm]" icon={WavesArrowUp}
          hasValue={hasValue(record.highTideTime) && hasValue(record.highTide)}
        >
          <TwoBox
            left={formatTime(record.highTideTime)} leftAlign="center"
            right={hasValue(record.highTide) ? `${record.highTide} cm` : null} rightAlign="right"
          />
        </InputTile>

        {/* 波高（アウターリーフ） */}
        <InputTile label="波高（アウターリーフ）" icon={Activity} hasValue={hasValue(record.waveOuter)}>
          <ButtonGroup options={WAVE_OPTIONS} value={record.waveOuter} />
        </InputTile>

        {/* 干潮時刻・高さ */}
        <InputTile label="干潮時刻・高さ[cm]" icon={WavesArrowDown}
          hasValue={hasValue(record.lowTideTime) && hasValue(record.lowTide)}
        >
          <TwoBox
            left={formatTime(record.lowTideTime)} leftAlign="center"
            right={hasValue(record.lowTide) ? `${record.lowTide} cm` : null} rightAlign="right"
          />
        </InputTile>

        {/* 波高（ショアゾーン） */}
        <InputTile label="波高（ショアゾーン）" icon={Activity} hasValue={hasValue(record.wave)}>
          <ButtonGroup options={WAVE_OPTIONS} value={record.wave} />
        </InputTile>

        {/* 風速（天気予報） */}
        <InputTile label="風速（天気予報）" icon={Gauge} hasValue={hasValue(record.windSpeed)}>
          <ButtonGroup options={WIND_SPEED_OPTIONS} value={record.windSpeed} />
        </InputTile>

        {/* 風速（現地） */}
        <InputTile label="風速（現地）" icon={Gauge} hasValue={hasValue(record.windSpeedDetail)}>
          <ButtonGroup options={WIND_SPEED_OPTIONS} value={record.windSpeedDetail} />
        </InputTile>

        {/* 風向（天気予報） */}
        <InputTile label="風向（天気予報）" icon={Compass} isExpandable={true} hasValue={hasValue(record.windDir)}>
          <ValBox value={labelOf(DIRECTIONS, record.windDir)} />
        </InputTile>

        {/* 風向（現地） */}
        <InputTile label="風向（現地）" icon={Compass} isExpandable={true} hasValue={hasValue(record.windDirDetail)}>
          <ValBox value={labelOf(DIRECTIONS, record.windDirDetail)} />
        </InputTile>

        {/* 注意報 */}
        <InputTile label="注意報" icon={TriangleAlert} isExpandable={true} hasValue={Boolean(warnText)}>
          <ChipList items={(record.warn || []).map(String)} removable={false} />
        </InputTile>

        {/* ビーチに対しての風向 */}
        <InputTile label="ビーチに対しての風向" icon={Wind} isExpandable={true} hasValue={hasValue(record.windShoreDetail)}>
          <ValBox value={labelOf(WIND_SHORE_OPTIONS, record.windShoreDetail)} />
        </InputTile>

        {/* 警報 */}
        <InputTile label="警報" icon={CircleAlert} isExpandable={true} hasValue={Boolean(alertText)}>
          <ChipList items={(record.alert || []).map(String)} removable={false} />
        </InputTile>

        {/* 利用者数 */}
        <InputTile label="利用者数" icon={Users} hasValue={hasValue(record.visitors)}>
          <UnitBox value={hasValue(record.visitors) ? record.visitors : null} unit="名" align="right" />
        </InputTile>

        {/* 使用車両 */}
        <InputTile label="使用車両" icon={Car} isExpandable={true}
          hasValue={hasValue(record.carType) && hasValue(record.carNo)}
        >
          <TwoBox left={carTypeLabel} right={record.carNo} />
        </InputTile>

        {/* ビーチ利用の特徴 */}
        <InputTile label="ビーチ利用の特徴" icon={WavesLadder} isExpandable={true} hasValue={featureItems.length > 0}>
          <ChipList items={featureItems} removable={false} />
        </InputTile>

        {/* メモ　→　未パトロール時はLogEntryViewと同じ黄色ハイライトを再現するため、
            hasValueをfalseに固定してbackgroundColorのオーバーライドを効かせる */}
        <InputTile label="メモ" icon={NotebookPen} isExpandable={true}
          backgroundColor={record.unpatrolled ? '#ECD283' : '#fff'}
          hasValue={!record.unpatrolled && hasValue(record.note)}
        >
          <TextAreaBox value={record.note} />
        </InputTile>

        {/* 注意喚起人数 */}
        <InputTile label="注意喚起人数" icon={Megaphone} isExpandable={true}
          hasValue={hasValue(record.jpWarning) && hasValue(record.forWarning)
            && hasValue(record.jpTourist) && hasValue(record.forTourist)}
        >
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
            <label style={labelLeftyStyle}>日本人県内在住</label>
            <label style={labelLeftyStyle}>外国人県内在住</label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <UnitBox value={hasValue(record.jpWarning) ? record.jpWarning : null} unit="名" align="right" />
            <UnitBox value={hasValue(record.forWarning) ? record.forWarning : null} unit="名" align="right" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
            <label style={labelLeftyStyle}>日本人観光客</label>
            <label style={labelLeftyStyle}>外国人観光客</label>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <UnitBox value={hasValue(record.jpTourist) ? record.jpTourist : null} unit="名" align="right" />
            <UnitBox value={hasValue(record.forTourist) ? record.forTourist : null} unit="名" align="right" />
          </div>
        </InputTile>

        {/* 申し送り事項 */}
        <InputTile label="申し送り事項（応急手当・救助・その他）" icon={HandHelping} isExpandable={true}
          hasValue={hasValue(record.handover)}
        >
          <TextAreaBox value={record.handover} />
        </InputTile>

        {/* 優先度 */}
        <InputTile label="優先度" icon={Flag} hasValue={hasValue(record.priority)}>
          <ButtonGroup options={PRIORITY_OPTIONS} value={record.priority} />
        </InputTile>

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
        </InputTile>

        {/* アップロードされた画像 */}
        <InputTile label="アップロードされた画像" icon={FileUp} isExpandable={true} hasValue={uploadedFiles.length > 0}>
          {uploadedFiles.length > 0 ? (
            <div style={fs.uploadGrid}>
              {uploadedFiles.map((file, i) => (
                <div key={i} style={fs.uploadItem}>
                  <div style={fs.uploadName}>{file.name}</div>
                  {file.url && <img src={file.url} alt={file.name} style={fs.uploadThumb} />}
                </div>
              ))}
            </div>
          ) : (
            <ValBox value={null} />
          )}
        </InputTile>

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
        </InputTile>

        {/* パトロール終了時刻 */}
        <InputTile label="パトロール終了時刻" icon={Clock} isExpandable={true} hasValue={hasValue(record.endTime ?? record.end_time)}>
          <ValBox value={formatTime(record.endTime ?? record.end_time)} align="center" />
        </InputTile>

      </main>

      {/* 取消確認ダイアログ */}
      {showCancelDialog && (
        <div style={overlayStyle}>
          <div style={dialogStyle}>
            <p style={dialogTextStyle}>この記録を記録一覧から取り消します。</p>
            <div style={dialogBtnsStyle}>
              <button
                onClick={handleCancel}
                disabled={isCancelling}
                style={{ ...dialogOkBtnStyle, opacity: isCancelling ? 0.6 : 1 }}
              >
                {isCancelling ? '処理中...' : '取消する'}
              </button>
              <button
                onClick={() => setShowCancelDialog(false)}
                style={dialogBackBtnStyle}
              >
                もどる
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </div>
  );
}

/* ── フィールドスタイル（LogEntryViewの配色に統一） ── */
const fs = {
  valBox: {
    backgroundColor: '#f3f4f6', borderRadius: '8px', border: 'none',
    padding: '8px 12px', fontSize: '13px', color: '#1e293b',
    minHeight: '36px', display: 'flex', alignItems: 'center',
  },
  textAreaBox: {
    backgroundColor: '#f3f4f6', borderRadius: '4px', border: 'none',
    padding: '8px 12px', fontSize: '13px', color: '#1e293b',
    minHeight: '60px', lineHeight: 1.6,
  },
  // react-select（customSelectStyles.multiValue）のバッジと同じ配色
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: '6px', padding: '2px 0' },
  chip: {
    backgroundColor: '#e0e0e0', borderRadius: '9999px',
    padding: '4px 10px', fontSize: '14px', color: '#1f2937',
    border: '1px solid #e5e7eb', display: 'inline-flex', alignItems: 'center', gap: '4px',
  },
  chipX: { color: '#9ca3af', fontSize: '12px' },
  placeholder: { fontSize: '13px', color: '#94a3b8' },
  unitLabel: { fontSize: '11px', fontWeight: 'bold', color: '#64748b', flexShrink: 0 },
  uploadGrid: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  uploadItem: { width: '72px' },
  uploadName: { fontSize: '10px', color: '#64748b', wordBreak: 'break-all', marginBottom: '4px' },
  uploadThumb: { width: '72px', height: '72px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #e2e8f0' },
  // LogEntryViewのradioBtnStyleと同じ配色（未選択: 白地グレー枠 / 選択: 水色枠+淡青地）
  btnRow: { display: 'flex', flexWrap: 'wrap', gap: '8px' },
  btn: {
    padding: '4px 10px', borderRadius: '8px', border: '1px solid #e2e8f0',
    fontSize: '14px', fontWeight: '600', backgroundColor: '#fff', color: '#64748b',
    textAlign: 'center', minWidth: '60px',
  },
  btnSel: { borderColor: '#38bdf8', backgroundColor: '#e0f2fe', color: '#0369a1' },
};

/* ── レイアウトスタイル（LogEntryViewと共通化） ── */
const container = { maxWidth: '820px', margin: '0 auto', width: '100%', minHeight: '100dvh', position: 'relative', backgroundColor: '#f1f5f9',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};
const headerTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px', margin: '0px 8px 0px 8px', backgroundColor: '#08172A' };
const headerMiddleStyle = { display: 'flex', alignItems: 'center', height: '20px', margin: '0px 8px 0px 8px' };
const headerBottomStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '30px', margin: '0px 8px 0px 8px' };
const logoTextStyle = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' };
const labelLeftyStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textAlign: 'left', width: '50%' };
const messageStyle = { padding: '40px', textAlign: 'center', color: '#64748b' };

// LogEntryView の saveBtnStyle と同じ角丸・サイズ感で「編集する／取消する」を再現
const editBtnStyle = { padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', height: '36px', minWidth: '96px' };
const cancelBtnStyle = { padding: '4px 8px', backgroundColor: '#fff', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: '8px', fontSize: '12px', height: '36px', minWidth: '96px' };

const overlayStyle = {
  position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const dialogStyle = {
  backgroundColor: 'white', borderRadius: '16px',
  padding: '28px 24px', maxWidth: '320px', width: '90%', textAlign: 'center',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};
const dialogTextStyle = { marginBottom: '20px', fontSize: '15px', lineHeight: 1.6 };
const dialogBtnsStyle = { display: 'flex', gap: '12px', justifyContent: 'center' };
const dialogOkBtnStyle = {
  padding: '10px 24px', border: '1.5px solid #ef4444', borderRadius: '8px',
  backgroundColor: 'white', color: '#ef4444',
  cursor: 'pointer', fontSize: '14px', fontWeight: 'bold',
};
const dialogBackBtnStyle = {
  padding: '10px 24px', border: '1.5px solid #cbd5e1', borderRadius: '8px',
  backgroundColor: '#f1f5f9', color: '#334155',
  cursor: 'pointer', fontSize: '14px',
};

export default LogDetailView;
