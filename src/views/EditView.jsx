import React, { useState, useEffect, forwardRef } from 'react';
import { X, Save, Clock, Cloud, Wind, Users, Gauge, Waves, Droplets, AlertCircle, User, 
  WavesArrowUp, WavesArrowDown, Compass, TrendingUpDown, Activity, WavesLadder, Megaphone, 
  NotebookPen, ChevronLeft, FileUp, Flag, HandHelping } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('ja', ja);
import InputTile from '../components/InputTile';
import { MultiSelectInput } from '../components/MultiSelectInput';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
//import styles from './EditView.module.css';
import { toast } from 'sonner';
import { Construction, Calendar } from 'lucide-react';
import { WEATHER_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS, PRIORITY_OPTIONS,
  WARNING_OPTIONS, ALERT_OPTIONS, TIDE_OPTIONS, WIND_SPEED_OPTIONS, DIRECTIONS } from '../constants';
import { COAST_DATA , ONNA_BEACHES } from '../constantsPublic';

// パトロールメンバー
import { useSafeMembers } from '../useSafeMembers';
// 車種名
import { useSafeCarInfo } from '../useSafeCarInfo';

const FEATURE_OPTIONS = ['海水浴', 'マリンスポーツ', 'ビーチスポーツ', 'BBQ', '散策', '遊具遊び', 'イベント'];

const initialFormData = {
  startDate: '', startTime: '', endTime: '', member: '', weather: '', windSpeed: '', tide: '', 
  highTideTime: '', highTide: '', lowTideTime: '', lowTide: '', current: '', windDir: '', windDirDetail: '', 
  wave: '', warn: '', alert: '', visitors: '', feature: '', 
  jpWarning: '', forWarning: '', note: '', handover: '', jpTourist: '', forTourist: '', carType: '', carNo: '',
  unpatrolled: false, area: '', beach: '', seq: 1
};

const EditView = ({ user, selectedCoast, selectedBeach, selectedDate, onSave, onSubmit, onBack, existingData, beach, setView, profileList, seq}) => {
//  const [formData, setFormData] = useState({startDate: selectedDate}, initialFormData);
//console.log('selectedDate:', selectedDate);
  const [formData, setFormData] = useState({
  ...initialFormData,  // 既存のデータを展開
  startDate: selectedDate,
  seq: seq,
});

  // アンパトロールモード
  const [unpatrolled, setUnpatrolled] = useState(false);

  // パトロールメンバー
  const safeMembers = useSafeMembers();
  //console.log('safeMembers:', safeMembers);
  // ログイン者を除く
   const exceptLogin = safeMembers.filter((member, index) => (member !== user.id));;
  
  
  // 車両名
  const safeCarInfo = useSafeCarInfo();
  //console.log('safeCarInfo:', safeCarInfo);
  
  //  const handleToggle = () => {
//    const nextStatus = !isUnpatrolled;
//    setIsUnpatrolled(nextStatus);
//
//    // エラーオブジェクトをクリア
//    setErrors({});
//    
//  }; 

  //
  const handleToggle = () => {
    setFormData(prev => ({
      ...prev,
      unpatrolled: !prev.unpatrolled
    }));

    // エラーオブジェクトをクリア
    setErrors({});
    
  }; 
   

//console.log('selectedDate:', selectedDate);
//console.log('startDate:', formData.startDate)
//  const members = profileList;

  // 既存データがあればフォームにセット
//  useEffect(() => {
//    console.log("EditView In:", existingData)
//    if (existingData) setFormData(existingData);
//    //setFormData({visitors: '0'});
//  }, [existingData]);

useEffect(() => {
  console.log("EditView In:", existingData);

  if (existingData) {
    // 1. まずは existingData をそのままコピーしたオブジェクトを作る
    const updatedData = { ...existingData };

    // 2. members が存在し、かつ配列の場合のみログイン者を削除する
    if (Array.isArray(existingData.members)) {
//      updatedData.members = existingData.members.slice(1);
      updatedData.members = existingData.members.filter(memberId => memberId !== user.id);
    }

    // 3. 加工したデータを State にセットする
    setFormData(updatedData);

    // 4. Unpatrollのステートをセットする
    setUnpatrolled(updatedData.unpatrolled);
  }
}, [existingData]);

// useEffect(() => {
//  setFormData(prev => ({
//    ...prev,
//    startDate: selectedDate
//  }));
//}, [selectedDate]);

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
  
  // 海岸名からidを返す
  const getCoastIdByName = (name) => COAST_DATA.find((c) => c.name === name)?.id;
  // ビーチ名からidを返す
  const getBeachIdByName = (name) => ONNA_BEACHES.find((c) => c.name === name)?.id;

  // 「送信」ボタンenable用
  const isFormValid = () => {
    // 必須項目を列挙して、すべてに値が入っているかチェック
    if (unpatrolled === true) {
      return (
        formData.handover &&
        formData.note
      )
    }
    else {
      return (
        (formData.members && formData.members.length > 0) &&
        formData.startTime && 
        formData.endTime &&
        (formData.weather || formData.weather === 0) &&
        (formData.current || formData.current === 0) &&
        formData.highTideTime &&
        formData.highTide &&
        (formData.waveOuter || formData.waveOuter === 0) &&
        formData.lowTideTime &&
        formData.lowTide &&
        (formData.wave || formData.wave === 0) &&
        formData.windDir && 
        (formData.tide || formData.tide === 0) &&
        formData.windDirDetail &&
        (formData.windSpeed || formData.windSpeed === 0) &&
        (formData.visitors || formData.visitors === 0) &&
        formData.warn &&
        formData.feature &&
        formData.alert &&
        (formData.jpWarning || formData.jpWarning === 0) &&
        (formData.forWarning || formData.forWarning === 0) &&
        (formData.jpTourist || formData.jpTourist === 0) &&
        (formData.forTourist || formData.forTourist === 0) &&
        formData.carType &&
        formData.carNo &&
        formData.handover &&
        formData.note
      )
    }
  };

  const isValid = isFormValid();
 
  // 「保存して閉じる」ボタン
  const handleSaveClick = () => {
    const newErrors = {};

/*  
    // 必須チェック
    console.log('formData:', formData);
    console.log('formData.unpatrolled:', formData.unpatrolled);
    //if (isUnpatrolled) {
    if (formData.unpatrolled) {
      if (!formData.members) newErrors.members = 'パトロールメンバーは入力が必須です';
      if (!formData.note) newErrors.note = '特記事項は入力が必須です';
    }
    else {
      if (!formData.members) newErrors.members = 'パトロールメンバーは入力が必須です';
      if (!formData.startTime) newErrors.startTime = 'パトロール開始時刻は入力が必須です';
      if (!formData.endTime) newErrors.endTime = 'パトロール終了時刻は入力が必須です';
      if (formData.weather === null || formData.weather === undefined || formData.weather === '') {
        newErrors.weather = '天候は入力が必須です';
      }  
      if (formData.current === null || formData.current === undefined || formData.current === '') {
        newErrors.current = '潮汐は入力が必須です';
      }
      if (!formData.highTideTime) newErrors.highTideTime = '満潮時刻は入力が必須です';
      if (!formData.highTide) newErrors.highTide = '満潮高さは入力が必須です';
      if (formData.waveOuter === null || formData.waveOuter === undefined || formData.waveOuter === '') {
        newErrors.waveOuter = '波高（アウターリーフ）は入力が必須です';
      }  
      if (!formData.lowTideTime) newErrors.lowTideTime = '干潮時刻は入力が必須です';
      if (!formData.lowTide) newErrors.lowTide = '干潮高さは入力が必須です';
      if (formData.wave === null || formData.wave === undefined || formData.wave === '') {
        newErrors.wave = '波高（ショアゾーン）は入力が必須です';
      }  
      if (!formData.windDir) newErrors.windDir = '風向（天気予報）は入力が必須です';
      if (!formData.windDirDetail) newErrors.windDirDetail = '風向（現地）は入力が必須です';
      if (formData.windSpeed === null || formData.windSpeed === undefined || formData.windSpeed === '') {
        newErrors.windSpeed = '風速（天気予報）は入力が必須です';
      }  
      if (formData.visitors === '' || formData.visitors === null || formData.visitors === undefined) {
        newErrors.visitors = '利用者数は入力が必須です';
      }
      if (!formData.warn) newErrors.warn = '注意報は入力が必須です';
      if (!formData.feature) newErrors.feature = 'ビーチ利用の特徴は入力が必須です';
      if (!formData.alert) newErrors.alert = '警報は入力が必須です';
      if (formData.jpWarning === '' || formData.jpWarning === null || formData.jpWarning === undefined) {
        newErrors.jpWarning = '注意喚起人数 日本人県内在住は入力が必須です';
      }
      if (formData.forWarning === '' || formData.forWarning === null || formData.forWarning === undefined) {
        newErrors.forWarning = '注意喚起人数 外国人県内在住は入力が必須です';
      }
      if (formData.jpTourist === '' || formData.jpTourist === null || formData.jpTourist === undefined) {
        newErrors.jpTourist = '注意喚起人数 日本人観光客は入力が必須です';
      }  
      if (formData.forTourist === '' || formData.forTourist === null || formData.forTourist === undefined) {
        newErrors.forTourist = '注意喚起人数 外国人観光客は入力が必須です';
      }
      if (!formData.carType) newErrors.carType = '車両情報 車種名は入力が必須です';
      if (!formData.carNo) newErrors.carNo = '車両情報 No.は入力が必須です';
      if (!formData.handover) newErrors.handover = '申し送り事項は入力が必須です';
      if (!formData.note) newErrors.note = '特記事項は入力が必須です';
    }

    // 未入力あり
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('未入力の項目があります');
      console.log('errors:', errors);
      return; 
    }
*/
  //  setFormData((prev) => ({
  //    ...prev,
  //    members: [user.id, ...prev.members]
  //  }));

    formData.startDate = selectedDate;
    formData.area = getCoastIdByName(selectedCoast);
    formData.beach = getBeachIdByName(selectedBeach);
    // 保存（indexedDB）処理
    onSave(formData);
  };

    // 「送信」ボタン
  const handleSendClick = () => {
    formData.startDate = selectedDate;
    formData.area = getCoastIdByName(selectedCoast);
    formData.beach = getBeachIdByName(selectedBeach);
    console.log('formData:', formData);
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
          //width: '100%',
          padding: '8px 12px 8px 12px', // 右側にアイコン用の余白を空ける
          border: '1px solid #ccc',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer'
        }}
        readOnly // 文字入力を防ぎ、クリックでカレンダーを開くようにする
      />
      {/* ★2. アイコンを絶対配置 */}
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

  //const formattedDate = format(selectedDate, 'M月d日 (eee)');
  const formattedDate = format(selectedDate, 'M月d日 (eee)', { locale: ja });
  //const dailySeq = 1

// label="パトロール開始時刻　パトロール終了時刻" icon={Clock}
//            <div className={styles.labelBaseStyle}>
//              <Clock size={12} style={{ marginRight: 4 }} /><label>パトロール終了時刻</label>
//            </div>

  return (
    <div style={container}>
    <div className="notranslate">
      <header>
        
        <div style={headerTopStyle}>
          {/*<div className={styles.dummyStyle} ></div>*/}
          <button onClick={onBack} style={{...logoTextStyle, backgroundColor: "#08172A", color: "#FFFFFF", border: "none"} }>＜</button>
          <span style={logoTextStyle}>記録入力</span>
          <span></span>
        </div>
        <div style={headerMiddleStyle}>{selectedCoast}</div>
        <div style={headerBottomStyle}>
          <h3>{selectedBeach}</h3>
          <button onClick={handleSaveClick} style={saveBtnStyle} >保存して閉じる</button>
          {/*
          <span style={{...doneTextStyle, color: existingData ? "#10b981" : "#ef4444"}}>
            {existingData ? "パトロール実施済み" : "パトロール未実施"}
          </span>
          */}
        </div>
        <div style={headerBottomStyle}>
          <span>{formattedDate}の記録 #{String(formData.seq).padStart(2, '0')}</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', alignItems: 'stretch' }}>

        {/* パトロールメンバー */}
        <InputTile label="ログイン者（記録担当者）" icon={User} isExpandable={true}>
          {/* ログイン者（記録担当者）を追加 */}
          <div>
            <input
              type="text"
              value={user.id || ''}
              disabled
              style={disabledInput}
            />
          </div>
          <div style={labelBaseStyle}>
            <Cloud size={12} style={{ marginRight: 4 }} /><label>自分以外のパトロールメンバー</label>
          </div>
          <MultiSelectInput
            options={exceptLogin}
            value={formData.members || []}
            onChange={(next) => {
              setFormData({ ...formData, members: next });
              if (errors.members && next.length > 0) {
                setErrors({ ...errors, members: null });
              }
            }}
            inputStyle={{
              ...inputMultiStyle,
              ...(errors.members ? { backgroundColor: '#fef2f2' } : {})
            }}
            placeholder="ユーザーID"
          />
        </InputTile>

        {/* パトロール開始時刻、終了時刻、天候 */}
        <InputTile isExpandable={true}>
          <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
            <Clock size={12} style={{ marginRight: 4 }} /><label style={{...labelLeftyStyle, fontSize: '12px' }}>パトロール開始時刻</label>
            <Clock size={12} style={{ marginRight: 4 }} /><label style={{...labelLeftyStyle, fontSize: '12px' }}>パトロール終了時刻</label>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.startTime ? errorInput : {})}}
              value={formData.startTime} onChange={e => {setFormData({...formData, startTime: e.target.value}); if (errors.startTime) setErrors({ ...errors, startTime: null });}} />
            <input type="time" style={{...inputStyle, ...(errors.endTime ? errorInput : {})}}
              value={formData.endTime} onChange={e => {setFormData({...formData, endTime: e.target.value}); if (errors.endTime) setErrors({ ...errors, endTime: null });}} />
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
        <InputTile label="潮汐" icon={Waves}>
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
        <InputTile label="潮流" icon={TrendingUpDown}>
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
        <InputTile label="満潮時刻・高さ[cm]" icon={WavesArrowUp}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.highTideTime ? errorInput : {})}}
              value={formData.highTideTime} onChange={e => {setFormData({...formData, highTideTime: e.target.value}); if (errors.highTideTime) setErrors({ ...errors, highTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] "style={{...inputStyle, textAlign: 'right', ...(errors.highTide ? errorInput : {})}}
              value={formData.highTide} onChange={e => {setFormData({...formData, highTide: e.target.value}); if (errors.highTide) setErrors({ ...errors, highTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        </InputTile>

        {/* 波高（アウターリーフ）*/}
        <InputTile label="波高（アウターリーフ）" icon={Activity}>
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
        <InputTile label="干潮時刻・高さ[cm]" icon={WavesArrowDown}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.lowTideTime ? errorInput : {})}}
              value={formData.lowTideTime} onChange={e => {setFormData({...formData, lowTideTime: e.target.value}); if (errors.lowTideTime) setErrors({ ...errors, lowTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] "style={{...inputStyle, textAlign: 'right', ...(errors.lowTide ? errorInput : {})}}
              value={formData.lowTide} onChange={e => {setFormData({...formData, lowTide: e.target.value}); if (errors.lowTide) setErrors({ ...errors, lowTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        </InputTile>

        {/* 波高（ショアゾーン） */}
        <InputTile label="波高（ショアゾーン）" icon={Activity}>
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
        <InputTile label="風向（天気予報）" icon={Compass} isExpandable={true}>
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
        <InputTile label="風向（現地）" icon={Compass} isExpandable={true}>
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
        <InputTile label="風速（天気予報）" icon={Gauge}>
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

        {/* 利用者数 */}
        <InputTile label="利用者数" icon={Users}>
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

        {/* 注意報 */}
        <InputTile label="注意報" icon={WavesLadder} isExpandable={true}>
          <MultiSelectInput
            options={WARNING_OPTIONS}
            value={formData.warn || []}
            onChange={(next) => {
              setFormData({ ...formData, warn: next });
              if (errors.members && next.length > 0) {
                setErrors({ ...errors, warn: null });
              }
            }}
            inputStyle={{
              ...inputMultiStyle,
              ...(errors.warn ? { backgroundColor: '#fef2f2' } : {})
            }}
            placeholder="注意報を選択"
          />
        </InputTile>

        {/* ビーチ利用の特徴 */}
        <InputTile label="ビーチ利用の特徴" icon={WavesLadder} isExpandable={true}>
          <MultiSelectInput
            options={FEATURE_OPTIONS}
            value={formData.feature || []}
            onChange={(next) => {
              setFormData({ ...formData, feature: next });
              if (errors.feature && next.length > 0) {
                setErrors({ ...errors, feature: null });
              }
            }}
            inputStyle={{
              ...inputMultiStyle,
              ...(errors.feature ? { backgroundColor: '#fef2f2' } : {})
            }}
            placeholder="特徴を選択"
          />
        </InputTile>

        {/* 警報 */}
        <InputTile label="警報" icon={WavesLadder} isExpandable={true}>
          <MultiSelectInput
            options={ALERT_OPTIONS}
            value={formData.alert || []}
            onChange={(next) => {
              setFormData({ ...formData, alert: next });
              if (errors.alert && next.length > 0) {
                setErrors({ ...errors, alert: null });
              }
            }}
            inputStyle={{
              ...inputMultiStyle,
              ...(errors.alert ? { backgroundColor: '#fef2f2' } : {})
            }}
            placeholder="警報を選択"
          />
        </InputTile>

        {/* 注意喚起人数 */}
        <InputTile label="注意喚起人数" icon={Megaphone} isExpandable={true}>
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

        {/* 車両情報、申し送り事項 */}
        <InputTile label="車両情報" icon={NotebookPen} isExpandable={true}>
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
          
          <div style={labelBaseStyle}>
            <HandHelping size={12} style={{ marginRight: 4 }} /><label>申し送り事項</label>
          </div>
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

        {/* 特記事項（応急手当・救助・その他） */}
        <InputTile label="特記事項（応急手当・救助・その他）" icon={NotebookPen} isExpandable={true}>
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
        
          <div style={labelBaseStyle}>
            <FileUp size={12} style={{ marginRight: 4 }} /><label>画像のアップロード</label>
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
            disabled={!isValid}
            style={{
              ...sendBtnStyle,
              //backgroundColor: isValid ? '#44445A' : '#777777',
              cursor: isValid ? 'pointer' : 'not-allowed',
              opacity: isValid ? 1 : 0.7
            }}
          >送信</button>
        </div>
      </footer>

    </div>
    </div>
  );
};

const container = { maxWidth: '820px', margin: '0 auto', width: '100%', minHeight: '100vh', position: 'relative', backgroundColor: '#f1f5f9' };
const headerTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px', margin: '0px 8px 0px 8px', backgroundColor: '#08172A' };
const headerMiddleStyle = { display: 'flex', alignItems: 'center', height: '20px', margin: '0px 8px 0px 8px' };
const headerBottomStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '30px', margin: '0px 8px 0px 8px' };
const inputMultiStyle = { padding: '4px', borderRadius: '4px', fontSize: '12px', height: '24px', backgroundColor: '#f3f4f6' };
const inputNumericStyle = { width: '80%', borderRadius: '4px', border: 'none', fontSize: '12px', height: '24px', backgroundColor: '#f3f4f6', textAlign: 'right' };
const inputNarrowStyle = { width: '100%', padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', backgroundColor: '#f3f4f6', textAlign: 'right' };
const inputNoteStyle = { padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', minHeight: '24px', backgroundColor: '#f3f4f6', resize: 'none', fieldSizing: 'content' };
const disabledInput = { width: '50%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#e5e7eb', color: '#6b7280', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed' };
const saveBtnStyle = { margintop: '8px', padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', height: '36px', width: '128px'};
//const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' };
const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
//const radioBtnStyle = { padding: '0px 6px', borderRadius: '4px', border: '1px solid', fontSize: '14px', fontWeight: '600', height: '20px' };
const radioBtnStyle = { padding: '4px 10px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', minWidth: '60px', transition: 'all 0.2s ease' };
const inputFlexStyle = { display: 'flex', flexWrap: 'noWrap', gap: '4px' };
const doneTextStyle = { backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '6px', fontSize: '9px', fontWeight: '600', border: '1px solid #d1d5db', display: 'inline-block' };
const logoTextStyle = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' };
const unitTextStyle = { fontSize: '11px', fontWeight: 'bold', paddingTop: '8px', color: '#64748b', width: '10%', };
const unpatrolledBtnStyle = { padding: '4px 8px', backgroundColor: '#cccccc',  color: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '14px', width: '128px', height: '36px', marginLeft: '8px' };
const sendBtnStyle = { padding: '4px 8px', backgroundColor: '#777777', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', width: '128px', height: '36px', marginRight: '8px' };
const errorInput = { borderColor: '#ef4444', backgroundColor: '#fef2f2' };
const labelBaseStyle = { fontSize: '12px', fontWeight: 'bold', color: '#64748b', display: 'flex', alignItems: 'center' };
const labelLeftyStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textalign: 'left', width: '50%' };

export default EditView;

