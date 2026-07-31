import React, { useState, useEffect, forwardRef } from 'react';
import { X, Save, Clock, Cloud, Wind, Users, Gauge, Waves, Droplets, User,
  WavesArrowUp, WavesArrowDown, Compass, TrendingUpDown, Activity, WavesLadder, Megaphone,
  NotebookPen, ChevronLeft, FileUp, Flag, HandHelping, Ban, Lock, Car, CircleAlert, TriangleAlert } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('ja', ja);
import InputTile from '../components/InputTile';
import { MultiSelectInput } from '../components/MultiSelectInput';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { toast } from 'sonner';
import { Construction, Calendar } from 'lucide-react';
import { WEATHER_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS, PRIORITY_OPTIONS,
  WARNING_OPTIONS, ALERT_OPTIONS, TIDE_OPTIONS, WIND_SPEED_OPTIONS, DIRECTIONS, FEATURE_OPTIONS } from '../constants';
import { COAST_DATA , ONNA_BEACHES } from '../constantsPublic';
// useNetworkState	ブラウザのネットワーク接続の状態を追跡する
import { useNetworkState } from 'react-use';
import Select from 'react-select';
import { useConfirm } from '../components/ConfirmDialogContext';


// パトロールメンバー
import { useSafeMembers } from '../useSafeMembers';
// 車種名
import { useSafeCarInfo } from '../useSafeCarInfo';

const initialFormData = {
  startDate: '', startTime: '', endTime: '', member: '', weather: '', windSpeed: '', windSpeedDetail: '', tide: '',
  highTideTime: '', highTide: '', lowTideTime: '', lowTide: '', current: '', windDir: '', windDirDetail: '',
  wave: '', warn: '', alert: '', visitors: '', feature: '',
  jpWarning: '', forWarning: '', note: '', handover: '', jpTourist: '', forTourist: '', carType: '', carNo: '',
  unpatrolled: false, area: '', beach: '', seq: 1, windShoreDetail: '',
};

// ログ入力（新規登録）専用画面。issue27適用前（0ddd60e時点）のUI・ロジックを復元したもの。
// パトロールメンバーの絞り込みだけは、useSafeMembers が返す形式（文字列配列）に合わせて
// 防御的な比較 (member?.user_id ?? member) に変更している（EditView.jsx と同じ対応）。
const LogEntryView = ({ user, selectedCoast, selectedBeach, selectedDate, onSave, onSubmit, onBack, existingData}) => {
  const [formData, setFormData] = useState({
  ...initialFormData,  // 既存のデータを展開
  startDate: selectedDate,
  seq: existingData.seq,
});

  // ネットワーク状態
  const netState = useNetworkState();

  // アンパトロールモード
  const [unpatrolled, setUnpatrolled] = useState(false);

  // パトロールメンバー
  const safeMembers = useSafeMembers();
  // ログイン者を除く（member は文字列で返ってくるため item 自体と比較する）
  const exceptLogin = safeMembers.filter(item => (item?.user_id ?? item) !== user.user_id);
// react-selectで使えるように
  // valueはuser_id文字列ではなく{id, user_id}オブジェクトそのものを保持する
  // （setinfo送信・indexedDB保存までidを引き継ぐため。0ddd60e時点の実装踏襲）
  const loginOptions = exceptLogin.map(item => ({
    value: item,
    label: item?.user_id ?? String(item),
  }));
  const warningOptions = WARNING_OPTIONS.map(item => ({
    value: item,
    label: item
  }));
  const alertOptions = ALERT_OPTIONS.map(item => ({
    value: item,
    label: item
  }));
  const featureOptions = FEATURE_OPTIONS.map(item => ({
    value: item,
    label: item
  }));


  // 車両名
  const safeCarInfo = useSafeCarInfo();

  //
  const confirm = useConfirm();
  const handleToggle = async() => {

    if (!unpatrolled) {
      const ok = await confirm({
        title: "確認",
        message: "このビーチにおける未送信のパトロールログは削除されます。パトロール未実施ですか？",
        okText: "パトロール未実施",
        cancelText: "もどる",
      });

      if (!ok) return;

      formData.startTime = '';
      formData.weather = '';
      formData.current = '';
      formData.waveOuter = '';
      formData.wave = '';
      formData.windDirDetail = '';
      formData.windSpeedDetail = '';
      formData.feature = '';
      formData.jpWarning = '';
      formData.forWarning = '';
      formData.jpTourist = '';
      formData.forTourist = '';
      formData.visitors = '';
      formData.handover = 'なし';
      formData.priority = '';
      formData.endTime = '';
    }

    setFormData(prev => ({
      ...prev,
      unpatrolled: !prev.unpatrolled
    }));

    setUnpatrolled(!unpatrolled);

    if (!unpatrolled && formData.note === "なし") {
      formData.note = "";
    }
    if (unpatrolled && formData.note === "") {
      formData.note = "なし";
    }

    // エラーオブジェクトをクリア
    setErrors({});

  };

useEffect(() => {

  if (existingData) {
    // 1. まずは existingData をそのままコピーしたオブジェクトを作る
    const updatedData = { ...existingData };
    // 2. members が存在し、かつ配列の場合のみログイン者を削除する
    if (Array.isArray(existingData.members)) {
      updatedData.members = existingData.members.filter(item => (item?.user_id ?? item) !== user.user_id);
    }

    // 3. 加工したデータを State にセットする
    setFormData(updatedData);

    // 4. Unpatrollのステートをセットする
    setUnpatrolled(updatedData.unpatrolled);
  }
}, [existingData]);

  // 全ての入力を削除（モックアップのみ）
  const handleClear = () => {
    toast.warning('入力内容をすべて消去しますか？', {
      duration: Infinity,
      action: {
        label: 'クリアする',
        onClick: () => {
          setFormData(initialFormData);
          toast.success('クリアしました');
        },
      },
      cancel: {
        label: 'キャンセル',
        onClick: () => toast.dismiss(),
      },
    });
  };

  // 必須項目入力チェック用
  const [errors, setErrors] = useState({});

  // 必須入力のチェック
  const isFormValid = () => {
    // メンバーは共通必須
    const hasMembers = formData.members?.length > 0;

    // Unpatroll時はメモのみ必須
    if (unpatrolled === true) {
      return (
        !!formData.note?.trim()
      );
    }

    // 数値フィールド（0 を有効値として許容）
    const numericFields = [
      formData.weather,
      formData.current,
      formData.waveOuter,
      formData.wave,
      formData.tide,
      formData.windSpeed,
      formData.windSpeedDetail,
      formData.visitors,
      formData.jpWarning,
      formData.forWarning,
      formData.jpTourist,
      formData.forTourist,
    ].every(v => v != null && v !== '');

    // 文字列・時刻フィールド（空文字を弾く）
    const textFields = [
      formData.startTime,
      formData.endTime,
      formData.highTideTime,
      formData.highTide,
      formData.lowTideTime,
      formData.lowTide,
      formData.windDir,
      formData.windDirDetail,
      formData.carType,
      formData.carNo,
      formData.handover,
      formData.note,
    ].every(v => !!v?.trim?.() || (v != null && typeof v !== 'string'));

    // マルチセレクトの配列フィールド（空文字ではなく空配列で「未選択」になるため、
    // textFieldsの文字列判定（v?.trim?.()）だと配列は素通りしてしまう。
    // 配列は必ず長さでチェックする）
    const arrayFields = [
      formData.warn,
      formData.feature,
      formData.alert,
    ].every(v => Array.isArray(v) && v.length > 0);

    return hasMembers && numericFields && textFields && arrayFields;
  };

  const isValid = isFormValid();

  // 「保存して閉じる」ボタン
  const handleSaveClick = () => {
    formData.startDate = selectedDate;
    formData.area = selectedCoast.no;
    formData.beach = selectedBeach.no;
    // 保存（indexedDB）処理
    onSave(formData);
  };

    // 「送信」ボタン
  const handleSendClick = () => {
    formData.startDate = selectedDate;
    formData.area = selectedCoast.no;
    formData.beach = selectedBeach.no;
    // 保存（indexedDB）処理
    onSubmit(formData);
  }

  // 複数選択のプルダウン
  const [isOpen, setIsOpen] = useState(false);

  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <input
        value={value}
        onClick={onClick}
        ref={ref}

        style={{
          padding: '8px 12px 8px 12px', // 右側にアイコン用の余白を空ける
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        readOnly // 文字入力を防ぎ、クリックでカレンダーを開くようにする
      />
      {/* アイコンを絶対配置 */}
      <Calendar
        size={20}
        style={{
          position: 'absolute',
          right: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          color: '#888',
          pointerEvents: 'none' // クリックイベントをinputに透過させる
        }}
      />
    </div>
  ));

  const formattedDate = format(selectedDate, 'M月d日 (eee)', { locale: ja });

  const isDisabled = !Boolean(isValid) || !netState.online;

  return (
    <div style={container}>
    <div className="notranslate">
      <header>

        <div style={headerTopStyle}>
          <button onClick={onBack} style={{...logoTextStyle, backgroundColor: "#08172A", color: "#FFFFFF", border: "none"} }>＜</button>
          <span style={logoTextStyle}>ログ入力</span>
          <span></span>
        </div>
        <div style={headerMiddleStyle}>{selectedCoast.name}</div>
        <div style={headerBottomStyle}>
          <h3>{selectedBeach.name}</h3>
          <button onClick={handleSaveClick} style={saveBtnStyle} >保存して閉じる</button>
        </div>
        <div style={headerBottomStyle}>
          <span>{formattedDate}の記録 #{String(formData.seq).padStart(2, '0')}</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', alignItems: 'stretch',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
       }}>

        {/* ログイン者（記録担当者） */}
        <InputTile label="ログイン者（記録担当者）" icon={User} isExpandable={false} hasValue={true}>
          <div>
            <input
              type="text"
              value={(user.id + user.name) || ''}
              disabled
              style={disabledInput}
            />
          </div>
        </InputTile>

        {/* パトロール開始時刻 */}
        <InputTile label="パトロール開始時刻"  icon={Clock} isExpandable={true}
          hasValue={(formData.startTime !== '' && formData.startTime !== null && formData.startTime !== undefined)
            && (formData.weather !== '' && formData.weather !== null && formData.weather !== undefined) 
          }
        >
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <input type="time" style={{...inputStyle, width: '40%', ...(errors.startTime ? errorInput : {})}}
              value={formData.startTime} onChange={e => {setFormData({...formData, startTime: e.target.value}); if (errors.startTime) setErrors({ ...errors, startTime: null });}} />
          </div>
        </InputTile>

        {/* 自分以外のパトロールメンバー */}
        <InputTile label="自分以外のパトロールメンバー" icon={User} isExpandable={true} hasValue={Boolean(formData.members && formData.members.length > 0)}>
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

        {/* 天候 */}
        <InputTile label="天候"  icon={Cloud} isExpandable={true}
          hasValue={(formData.startTime !== '' && formData.startTime !== null && formData.startTime !== undefined)
            && (formData.weather !== '' && formData.weather !== null && formData.weather !== undefined) 
          }
        >
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

        {/* ビーチに対しての風向 */}
        <InputTile label="ビーチに対しての風向" icon={Compass} isExpandable={true}
          hasValue={formData.windShoreDetail !== '' && formData.windShoreDetail !== null && formData.windShoreDetail !== undefined}>
          <select
            value={formData.windShoreDetail || ''}
            onChange={e => {
              const val = e.target.value;
              // 選択されたIDを数値に変換して保存（未選択時は空文字）
              setFormData({ ...formData, windShoreDetail: val !== '' ? Number(val) : '' });
              if (errors.windShoreDetail) setErrors({ ...errors, windShoreDetail: null });
            }}
            style={{...inputStyle, ...(errors.windShoreDetail ? errorInput : {})}}
          >
            <option value="">ー選択ー</option>
              {DIRECTIONS.map(d => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
          </select>
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

        {/* メモ */}
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

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
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
        </InputTile>

        {/* 空欄（位置合わせ） */}
        <InputTile isExpandable={true} backgroundColor={'#f1f5f9'} border={'none'}>
        </InputTile>

        <InputTile label="優先度" icon={Flag} isExpandable={false}
         hasValue={(formData.priority !== '' && formData.priority !== null && formData.priority !== undefined)
          }
        >
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

          <button
            type="button"
            onClick={handleToggle}
            style={{...unpatrolledBtnStyle, backgroundColor: formData.unpatrolled ? '#ECD283' : '#cccccc',}}>
            Unpatrolled
          </button>

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
    WebkitTextFillColor: '#000000', opacity: '1'
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

export default LogEntryView;
