import React, { useState, useEffect, forwardRef } from 'react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('ja', ja);
import { MultiSelectInput } from '../components/MultiSelectInput';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
//import styles from './EditView.module.css';
import { Construction, Calendar } from 'lucide-react';
import { WEATHER_OPTIONS, CURRENT_OPTIONS, WAVE_OPTIONS, PRIORITY_OPTIONS,
  WARNING_OPTIONS, ALERT_OPTIONS, TIDE_OPTIONS, WIND_SPEED_OPTIONS, DIRECTIONS, FEATURE_OPTIONS,
  WIND_SHORE_OPTIONS } from '../constants';
import { COAST_DATA , ONNA_BEACHES } from '../constantsPublic';
import Select from 'react-select';


// パトロールメンバー
import { useSafeMembers } from '../useSafeMembers';
// 車種名
import { useSafeCarInfo } from '../useSafeCarInfo';

const initialFormData = {
  startDate: '', startTime: '', endTime: '', member: '', weather: '', windSpeed: '', windSpeedDetail: '',
  tide: '', highTideTime: '', highTide: '', lowTideTime: '', lowTide: '', current: '',
  windDir: '', windDirDetail: '', windShoreDetail: '', wave: '', warn: '', alert: '', visitors: '', feature: '',
  jpWarning: '', forWarning: '', note: '', handover: '', jpTourist: '', forTourist: '', carType: '', carNo: '',
  unpatrolled: false, area: '', beach: '', seq: 1
};

const EditView = ({ user, selectedCoast, selectedBeach, selectedDate, onBack, existingData, beach, setView, profileList, seq, onUpdate }) => {
  const [formData, setFormData] = useState({
  ...initialFormData,  // 既存のデータを展開
  startDate: selectedDate,
  seq: existingData.seq,
});

  // パトロールメンバー
  const safeMembers = useSafeMembers();
  // ログイン者を除く（member.user_id は「ID+姓」の合成形式なので、同じ形式の user.user_id と比較する。
  // user.id は姓を含まない生IDのため、これと比較すると常に不一致になり誰も除外できていなかった）
  const exceptLogin = safeMembers.filter(member =>
    (member?.user_id ?? member) !== user.user_id
  );
  const loginOptions = exceptLogin.map(item => {
    const uid = item?.user_id ?? String(item);
    return { value: uid, label: uid };
  });
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

useEffect(() => {
//console.log("EditView In:", existingData);

  if (existingData) {
    // 1. まずは existingData をそのままコピーしたオブジェクトを作る
    const updatedData = { ...existingData };
    // 2. members が存在し、かつ配列の場合のみログイン者を削除する
    // （members は文字列配列で返ってくるため、item.user_id ではなく item 自体と比較する）
    if (Array.isArray(existingData.members)) {
      updatedData.members = existingData.members.filter(item => (item?.user_id ?? item) !== user.user_id);
    }

    // 3. 加工したデータを State にセットする
    setFormData(updatedData);
  }
}, [existingData]);

  // 必須項目入力チェック用
  const [errors, setErrors] = useState({});

  // 「保存して閉じる」ボタン
  const handleSaveClick = () => {
    formData.startDate = selectedDate;
    formData.area = selectedCoast.no;
    formData.beach = selectedBeach.no;
    onUpdate(formData);
  };

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

  //const formattedDate = format(selectedDate, 'M月d日 (eee)');
  const formattedDate = format(selectedDate, 'M月d日 (eee)', { locale: ja });

  // ログ詳細画面と同じグリッド構造（左右ペアのCSS Grid・罫線区切り・グレー背景）で組む。
  // 各行は { label, content } のペアで、右側だけの行は left: null にする
  const rows = [
    {
      left: {
        label: 'ログイン者（記録担当者）',
        content: (
          <input
            type="text"
            value={(user.id + user.name) || ''}
            disabled
            style={disabledInput}
          />
        ),
      },
      right: {
        label: 'パトロール開始時刻',
        content: (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <input type="time" style={{...inputStyle, width: '40%', ...(errors.startTime ? errorInput : {})}}
              value={formData.startTime} onChange={e => {setFormData({...formData, startTime: e.target.value}); if (errors.startTime) setErrors({ ...errors, startTime: null });}} />
          </div>
        ),
      },
    },
    {
      left: {
        label: '自分以外のパトロールメンバー',
        content: (
          <Select
            isMulti
            isSearchable
            options={loginOptions}
            value={(Array.isArray(formData.members) ? formData.members : []).map(item => {
              const uid = item?.user_id ?? String(item);
              return { value: uid, label: uid };
            })}
            onChange={(selectedOptions) => {
              const nextMembers = (selectedOptions || []).map(option => option.value);
              setFormData({ ...formData, members: nextMembers });
            }}
            placeholder="ユーザーID"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
            menuPortalTarget={document.body}
            menuPosition="fixed"
          />
        ),
      },
      right: {
        label: '天候',
        content: (
          <div style={radioFlexStyle}>
            {WEATHER_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, weather: opt.id });
                  if (errors.weather) setErrors({ ...errors, weather: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.weather ? '#ef4444' : (formData.weather === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.weather === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.weather === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: {
        label: '潮汐',
        content: (
          <div style={radioFlexStyle}>
            {TIDE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, tide: opt.id });
                  if (errors.tide) setErrors({ ...errors, tide: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.tide ? '#ef4444' : (formData.tide === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.tide === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.tide === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
      right: {
        label: '潮流',
        content: (
          <div style={radioFlexStyle}>
            {CURRENT_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, current: opt.id });
                  if (errors.current) setErrors({ ...errors, current: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.current ? '#ef4444' : (formData.current === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.current === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.current === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: {
        label: '満潮時刻・高さ[cm]',
        content: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.highTideTime ? errorInput : {})}}
              value={formData.highTideTime} onChange={e => {setFormData({...formData, highTideTime: e.target.value}); if (errors.highTideTime) setErrors({ ...errors, highTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] " style={{...inputStyle, textAlign: 'right', ...(errors.highTide ? errorInput : {})}}
              value={formData.highTide} onChange={e => {setFormData({...formData, highTide: e.target.value}); if (errors.highTide) setErrors({ ...errors, highTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        ),
      },
      right: {
        label: '波高（アウターリーフ）',
        content: (
          <div style={radioFlexStyle}>
            {WAVE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, waveOuter: opt.id });
                  if (errors.waveOuter) setErrors({ ...errors, waveOuter: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.waveOuter ? '#ef4444' : (formData.waveOuter === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.waveOuter === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.waveOuter === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: {
        label: '干潮時刻・高さ[cm]',
        content: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <input type="time" style={{...inputStyle, ...(errors.lowTideTime ? errorInput : {})}}
              value={formData.lowTideTime} onChange={e => {setFormData({...formData, lowTideTime: e.target.value}); if (errors.lowTideTime) setErrors({ ...errors, lowTideTime: null });}} />
            <input type="number" placeholder="高さ [cm] " style={{...inputStyle, textAlign: 'right', ...(errors.lowTide ? errorInput : {})}}
              value={formData.lowTide} onChange={e => {setFormData({...formData, lowTide: e.target.value}); if (errors.lowTide) setErrors({ ...errors, lowTide: null });}} />
            <span style={unitTextStyle}>cm</span>
          </div>
        ),
      },
      right: {
        label: '波高（ショアゾーン）',
        content: (
          <div style={radioFlexStyle}>
            {WAVE_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, wave: opt.id });
                  if (errors.wave) setErrors({ ...errors, wave: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.wave ? '#ef4444' : (formData.wave === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.wave === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.wave === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: {
        label: '風速（天気予報）',
        content: (
          <div style={radioFlexStyle}>
            {WIND_SPEED_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, windSpeed: opt.id });
                  if (errors.windSpeed) setErrors({ ...errors, windSpeed: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.windSpeed ? '#ef4444' : (formData.windSpeed === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.windSpeed === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.windSpeed === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
      right: {
        label: '風速（現地）',
        content: (
          <div style={radioFlexStyle}>
            {WIND_SPEED_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setFormData({ ...formData, windSpeedDetail: opt.id });
                  if (errors.windSpeedDetail) setErrors({ ...errors, windSpeedDetail: null });
                }}
                style={{
                  ...radioBtnStyle,
                  borderColor: errors.windSpeedDetail ? '#ef4444' : (formData.windSpeedDetail === opt.id ? '#38bdf8' : '#e2e8f0'),
                  backgroundColor: formData.windSpeedDetail === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.windSpeedDetail === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: {
        label: '風向（天気予報）',
        content: (
          <select
            value={formData.windDir || ''}
            onChange={e => {
              const val = e.target.value;
              setFormData({ ...formData, windDir: val !== '' ? Number(val) : '' });
              if (errors.windDir) setErrors({ ...errors, windDir: null });
            }}
            style={{...inputStyle, ...(errors.windDir ? errorInput : {})}}
          >
            <option value="">ー選択ー</option>
            {DIRECTIONS.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}
          </select>
        ),
      },
      right: {
        label: '風向（現地）',
        content: (
          <select
            value={formData.windDirDetail || ''}
            onChange={e => {
              const val = e.target.value;
              setFormData({ ...formData, windDirDetail: val !== '' ? Number(val) : '' });
              if (errors.windDirDetail) setErrors({ ...errors, windDirDetail: null });
            }}
            style={{...inputStyle, ...(errors.windDirDetail ? errorInput : {})}}
          >
            <option value="">ー選択ー</option>
            {DIRECTIONS.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}
          </select>
        ),
      },
    },
    {
      left: {
        label: '注意報',
        content: (
          <Select
            isMulti
            isSearchable={false}
            options={warningOptions}
            value={(formData.warn || []).map(item => ({ value: item, label: item }))}
            onChange={(selectedOptions) => {
              const currentValues = (selectedOptions || []).map(option => option.value);
              let updatedValues = currentValues;
              const prevValues = formData.warn || [];
              const addedValue = currentValues.find(val => !prevValues.includes(val));
              if (addedValue === 'なし') {
                updatedValues = ['なし'];
              } else if (currentValues.includes('なし') && currentValues.length > 1) {
                updatedValues = currentValues.filter(val => val !== 'なし');
              }
              setFormData({ ...formData, warn: updatedValues });
            }}
            placeholder="注意報"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />
        ),
      },
      right: {
        label: 'ビーチに対しての風向',
        content: (
          <select
            value={formData.windShoreDetail || ''}
            onChange={e => {
              const val = e.target.value;
              setFormData({ ...formData, windShoreDetail: val !== '' ? Number(val) : '' });
              if (errors.windShoreDetail) setErrors({ ...errors, windShoreDetail: null });
            }}
            style={{...inputStyle, ...(errors.windShoreDetail ? errorInput : {})}}
          >
            <option value="">ー選択ー</option>
            {WIND_SHORE_OPTIONS.map(d => (<option key={d.id} value={d.id}>{d.label}</option>))}
          </select>
        ),
      },
    },
    {
      left: {
        label: '警報',
        content: (
          <Select
            isMulti
            isSearchable={false}
            options={alertOptions}
            value={(formData.alert || []).map(item => ({ value: item, label: item }))}
            onChange={(selectedOptions) => {
              const currentValues = (selectedOptions || []).map(option => option.value);
              let updatedValues = currentValues;
              const prevValues = formData.alert || [];
              const addedValue = currentValues.find(val => !prevValues.includes(val));
              if (addedValue === 'なし') {
                updatedValues = ['なし'];
              } else if (currentValues.includes('なし') && currentValues.length > 1) {
                updatedValues = currentValues.filter(val => val !== 'なし');
              }
              setFormData({ ...formData, alert: updatedValues });
            }}
            placeholder="警報"
            noOptionsMessage={() => "見つかりません"}
            styles={customSelectStyles}
          />
        ),
      },
      right: {
        label: '利用者数',
        content: (
          <div style={inputFlexStyle}>
            <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.visitors ? errorInput : {})}}
              value={formData.visitors}
              onChange={e => { const val = e.target.value; setFormData({...formData, visitors: val === '' ? '' : Number(val)}); if (errors.visitors) setErrors({ ...errors, visitors: null }); }} />
            <label style={unitTextStyle}>名</label>
          </div>
        ),
      },
    },
    {
      left: {
        label: '使用車両',
        content: (
          <div style={{ display: 'flex', gap: '8px' }}>
            <select
              style={{...inputStyle, ...(errors.carType ? errorInput : {})}}
              value={formData.carType || ''}
              onChange={e => {
                const val = e.target.value;
                setFormData({ ...formData, carType: val !== '' ? Number(val) : '' });
                if (errors.carType) setErrors({ ...errors, carType: null });
              }}
            >
              <option value="">車種名</option>
              {safeCarInfo.map(d => (<option key={d.order} value={d.order}>{d.carType}</option>))}
            </select>
            <input type="text" placeholder="No." inputMode="numeric" maxLength={4} style={{...inputStyle, ...(errors.carNo ? errorInput : {})}}
              value={formData.carNo}
              onChange={e => {
                const val = e.target.value.replace(/[^0-9]/g, '');
                setFormData({...formData, carNo: val});
                if (errors.carNo) setErrors({ ...errors, carNo: null });
              }} />
          </div>
        ),
      },
      right: {
        label: 'ビーチ利用の特徴',
        content: (
          <Select
            isMulti
            isSearchable={false}
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
        ),
      },
    },
    {
      left: {
        label: 'メモ',
        highlight: formData.unpatrolled,
        content: (
          <>
            <textarea
              value={formData.note}
              maxLength={100}
              onChange={(e) => {
                setFormData({...formData, note: e.target.value});
                if (errors.note) setErrors({ ...errors, note: null });
              }}
              style={{...inputNoteStyle, ...(errors.note ? errorInput : {})}} />
            <div style={{
              fontSize: '10px',
              color: formData.note.length >= 100 ? '#ef4444' : '#64748b',
              fontWeight: formData.note.length >= 100 ? 'bold' : 'normal',
              userSelect: 'none',
              textAlign: 'right'
            }}>
              {formData.note.length} / 100
            </div>
          </>
        ),
      },
      right: {
        label: '注意喚起人数',
        content: (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label style={labelLeftyStyle}>日本人県内在住</label>
              <label style={labelLeftyStyle}>外国人県内在住</label>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.jpWarning ? errorInput : {})}}
                value={formData.jpWarning}
                onChange={e => { const val = e.target.value; setFormData({...formData, jpWarning: val === '' ? '' : Number(val)}); if (errors.jpWarning) setErrors({ ...errors, jpWarning: null }); }} />
              <label style={unitTextStyle}>名</label>
              <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.forWarning ? errorInput : {})}}
                value={formData.forWarning}
                onChange={e => { const val = e.target.value; setFormData({...formData, forWarning: val === '' ? '' : Number(val)}); if (errors.forWarning) setErrors({ ...errors, forWarning: null }); }} />
              <label style={unitTextStyle}>名</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label style={labelLeftyStyle}>日本人観光客</label>
              <label style={labelLeftyStyle}>外国人観光客</label>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.jpTourist ? errorInput : {})}}
                value={formData.jpTourist}
                onChange={e => { const val = e.target.value; setFormData({...formData, jpTourist: val === '' ? '' : Number(val)}); if (errors.jpTourist) setErrors({ ...errors, jpTourist: null }); }} />
              <label style={unitTextStyle}>名</label>
              <input type="number" inputMode="numeric" style={{...inputNarrowStyle, ...(errors.forTourist ? errorInput : {})}}
                value={formData.forTourist}
                onChange={e => { const val = e.target.value; setFormData({...formData, forTourist: val === '' ? '' : Number(val)}); if (errors.forTourist) setErrors({ ...errors, forTourist: null }); }} />
              <label style={unitTextStyle}>名</label>
            </div>
          </>
        ),
      },
    },
    {
      left: null,
      right: {
        label: '申し送り事項（応急手当・救助・その他）',
        content: (
          <>
            <textarea
              value={formData.handover}
              maxLength={100}
              onChange={(e) => {
                setFormData({...formData, handover: e.target.value});
                if (errors.handover) setErrors({ ...errors, handover: null });
              }}
              style={{...inputNoteStyle, ...(errors.handover ? errorInput : {})}} />
            <div style={{
              fontSize: '10px',
              color: formData.handover.length >= 100 ? '#ef4444' : '#64748b',
              fontWeight: formData.handover.length >= 100 ? 'bold' : 'normal',
              userSelect: 'none',
              textAlign: 'right'
            }}>
              {formData.handover.length} / 100
            </div>
          </>
        ),
      },
    },
    {
      left: null,
      right: {
        label: '優先度',
        content: (
          <div style={radioFlexStyle}>
            {PRIORITY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, priority: opt.id })}
                style={{
                  ...radioBtnStyle,
                  borderColor: formData.priority === opt.id ? '#38bdf8' : '#e2e8f0',
                  backgroundColor: formData.priority === opt.id ? '#e0f2fe' : '#fff',
                  color: formData.priority === opt.id ? '#0369a1' : '#64748b'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        ),
      },
    },
    {
      left: null,
      right: {
        label: 'パトロール終了時刻',
        content: (
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <input type="time" style={{...inputStyle, width: '40%', ...(errors.endTime ? errorInput : {})}}
              value={formData.endTime} onChange={e => {setFormData({...formData, endTime: e.target.value}); if (errors.endTime) setErrors({ ...errors, endTime: null });}} />
          </div>
        ),
      },
    },
    {
      left: null,
      right: { label: '画像のアップロード', content: null },
    },
  ];

  return (
    <div style={container}>
    <div className="notranslate">
      <div style={stickyTopStyle}>
      <header>
        <div style={headerTopStyle}>
          <button onClick={onBack} style={{...logoTextStyle, backgroundColor: "#08172A", color: "#FFFFFF", border: "none"} }>＜</button>
          <span style={logoTextStyle}>ログ編集</span>
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
      </div>

      <main style={gridStyle}>
        {rows.map((row, i) => {
          const isLastRow = i === rows.length - 1;
          const rowBorder = isLastRow ? {} : rowDividerStyle;
          return (
            <React.Fragment key={i}>
              <div style={{ ...cellStyle, ...cellLeftStyle, ...rowBorder, ...(row.left?.highlight ? { backgroundColor: '#ECD283' } : {}) }}>
                {row.left && (<><div style={cellLabelStyle}>{row.left.label}</div>{row.left.content}</>)}
              </div>
              <div style={{ ...cellStyle, ...rowBorder, ...(row.right?.highlight ? { backgroundColor: '#ECD283' } : {}) }}>
                {row.right && (<><div style={cellLabelStyle}>{row.right.label}</div>{row.right.content}</>)}
              </div>
            </React.Fragment>
          );
        })}
      </main>

    </div>
    </div>
  );
};

const container = { maxWidth: '820px', margin: '0 auto', width: '100%', minHeight: '100dvh', position: 'relative', backgroundColor: '#fff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};
// ヘッダー〜エリア/ビーチ/日付/保存ボタンをまとめてスクロール上部に固定する（ログ詳細画面と同様）
const stickyTopStyle = { position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'white' };
const headerTopStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '48px', margin: '0px 8px 0px 8px', backgroundColor: '#08172A' };
const headerMiddleStyle = { display: 'flex', alignItems: 'center', height: '20px', margin: '0px 8px 0px 8px' };
const headerBottomStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '30px', margin: '0px 8px 0px 8px' };
const inputNarrowStyle = { width: '100%', padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', backgroundColor: '#f3f4f6', textAlign: 'right' };
const inputNoteStyle = { width: '100%', boxSizing: 'border-box', padding: '4px', borderRadius: '4px', border: 'none', fontSize: '12px', minHeight: '60px', backgroundColor: '#f3f4f6', resize: 'none', fieldSizing: 'content' };
const disabledInput = { width: '50%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#e5e7eb', border: 'none', borderRadius: '8px', fontSize: '13px', cursor: 'not-allowed', color: '#000000',
    webkitTextFillColor: '#000000', opacity: '1'
   };
const saveBtnStyle = { margintop: '8px', padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '12px', height: '36px', width: '128px'};
// ログ詳細画面のButtonGroupと同じく、選択肢の文字数に関わらずflex:1で等幅にする
const radioFlexStyle = { display: 'flex', gap: '8px' };
const radioBtnStyle = { flex: 1, padding: '4px 6px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', transition: 'all 0.2s ease' };
const inputFlexStyle = { display: 'flex', flexWrap: 'noWrap', gap: '4px' };
const logoTextStyle = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' };
const inputStyle = { width: '100%', boxSizing: 'border-box', padding: '8px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' };
const unitTextStyle = { fontSize: '11px', fontWeight: 'bold', paddingTop: '8px', color: '#64748b', width: '10%', };
const errorInput = { borderColor: '#ef4444', backgroundColor: '#fef2f2' };
const labelLeftyStyle = { fontSize: '10px', fontWeight: 'bold', color: '#64748b', textalign: 'left', width: '50%' };

// ログ編集画面はカード枠なしのグリッド。白背景に罫線区切り（ログ詳細画面と同じ構造で背景色のみ白）
const gridStyle = { display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: '#fff' };
const cellStyle = { padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 };
const cellLeftStyle = { borderRight: '1px solid #e2e8f0' };
const rowDividerStyle = { borderBottom: '1px solid #e2e8f0' };
const cellLabelStyle = { fontSize: '12px', fontWeight: 'bold', color: '#334155' };

const customSelectStyles = {
  // menuPortalTarget={document.body} でメニューがDOMツリーの外（body直下）に描画されるため、
  // 画面側のフォント指定を継承できずブラウザ既定フォント（明朝系）になってしまう。
  // ポータルのルートで明示的に指定し、配下のメニュー/選択肢に継承させる
  menuPortal: (provided) => ({
    ...provided,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  }),
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

export default EditView;

