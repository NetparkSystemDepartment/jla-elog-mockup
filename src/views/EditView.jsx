import React, { useState, useEffect, forwardRef } from 'react';
import { X, Save, Clock, Cloud, Wind, Users, Gauge, Waves, Droplets, AlertCircle, User, 
  WavesArrowUp, WavesArrowDown, Compass, TrendingUpDown, Activity, WavesLadder, Megaphone, 
  NotebookPen, ChevronLeft } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
registerLocale('ja', ja);
import InputTile from '../components/InputTile';
import { MultiSelectInput } from '../components/MultiSelectInput';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import styles from './EditView.module.css';
import { toast } from 'sonner';
import { Construction, Calendar } from 'lucide-react';

const WEATHER_OPTIONS = ['晴', '曇り', '雨', '雷雨'];
const WIND_SPEED_OPTIONS = ['0～4m/s', '5～10m/s', '11m/s～'];
const TIDE_OPTIONS = ['大潮', '中潮', '小潮', '長潮', '若潮'];
const CURRENT_OPTIONS = ['下げ潮', '上げ潮'];
const WAVE_OPTIONS = ['0～0.5m', '0.6～1m', '1.1～1.5m', '1.6m～'];
const DIRECTIONS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
const WARNIBG_OPTIONS = ['なし', '大雨', '洪水', '強風', '風雪', '波浪', '高潮', '雷', '濃霧'];
const ALERT_OPTIONS = ['なし', '大雨', '洪水', '暴風', '暴風雪', '波浪', '高潮'];
const FEATURE_OPTIONS = ['海水浴', 'マリンスポーツ', 'ビーチスポーツ', 'BBQ', '散策', '遊具遊び', 'イベント'];
const WARNIBG_OPTIONS2 = ['なし', '大雨注意報', '洪水注意報', '強風注意報', '風雪注意報', '波浪注意報', '高潮注意報', '雷注意報', '濃霧注意報'];
const ALERT_OPTIONS2 = ['なし', '大雨警報', '洪水警報', '暴風警報', '暴風雪警報', '波浪警報', '高潮警報'];
const PRIORITY_OPTIONS = ['高', '中', '低'];
const CARTYPE = ['車種Ａ', '車種Ｂ', '車種Ｃ'];

const initialFormData = {
  startTime: '', endTime: '', member: '', weather: '', windSpeed: '', tide: '', 
  highTideTime: '', highTide: '', lowTideTime: '', lowTide: '', current: '', windDir: '', windDirDetail: '', 
  wave: '', warn: '', alert: '', visitors: '', feature: '', 
  jpWarning: '', forWarning: '', note: '', handover: '', jpTourist: '', forTourist: '', carType: '', carNo: ''
};

const EditView = ({ selectedCoast, selectedBeach, selectedDate, onSave, onSubmit, onBack, existingData, beach, setView }) => {
  const [formData, setFormData] = useState({startDate: selectedDate}, initialFormData);

  // 既存データがあればフォームにセット
  useEffect(() => {
    console.log("EditView In:", existingData)
    if (existingData) setFormData(existingData);
  }, [existingData]);

  // 全ての入力を削除
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

  const [errors, setErrors] = useState({});
  // 「保存して閉じる」ボタン
  const handleSaveClick = () => {
    const newErrors = {};

    // 必須チェック
    if (!formData.weather) newErrors.startTime = 'パトロール開始時刻は入力が必須です';
    if (!formData.tide) newErrors.endTime = 'パトロール終了時刻は入力が必須です';

    // 未入力あり
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast.error('未入力の項目があります');
      return; 
    }

    // 保存（indexedDB）処理
    onSave(formData);
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
  const dailySeq = 1

// label="パトロール開始時刻　パトロール終了時刻" icon={Clock}
//            <div className={styles.labelBaseStyle}>
//              <Clock size={12} style={{ marginRight: 4 }} /><label>パトロール終了時刻</label>
//            </div>
  return (
    <div className={styles.container}>
    <div className="notranslate">
      <header>
        
        <div className={styles.headerTopStyle}>
          {/*<div className={styles.dummyStyle} ></div>*/}
          <button onClick={onBack} style={{...logoTextStyle, backgroundColor: "#44445a", color: "#FFFFFF", border: "none"} }>＜</button>
          <span style={logoTextStyle}>記録入力</span>
          <span></span>
        </div>
        <div className={styles.headerMiddleStyle}>{selectedCoast}</div>
        <div className={styles.headerBottomStyle}>
          <h3>{selectedBeach}</h3>
          <button onClick={handleSaveClick} className={styles.saveBtnStyle} >保存して閉じる</button>
          {/*
          <span style={{...doneTextStyle, color: existingData ? "#10b981" : "#ef4444"}}>
            {existingData ? "パトロール実施済み" : "パトロール未実施"}
          </span>
          */}
        </div>
        <div className={styles.headerBottomStyle}>
          <span>{formattedDate}の記録 #{String(dailySeq).padStart(2, '0')}</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px', alignItems: 'stretch' }}>
          <InputTile label="パトロールメンバー" icon={User} isExpandable={true}>
            <MultiSelectInput
              options={['担当A', '担当B', '担当C']}
              value={formData.members || []}
              onChange={(next) => setFormData({ ...formData, members: next })}
              inputStyle={styles.inputMultiStyle}
              placeholder="ユーザーID"
            />
          </InputTile>

          <InputTile isExpandable={true}>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <Clock size={12} style={{ marginRight: 4 }} /><label className={styles.labelLeftyStyle}>パトロール開始時刻</label>
              <Clock size={12} style={{ marginRight: 4 }} /><label className={styles.labelLeftyStyle}>パトロール終了時刻</label>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="time" style={editStyles.input}
                value={formData.startTime} onChange={e => setData({...formData, startTime: e.target.value})} />
              <input type="time" style={editStyles.input}
                value={formData.endTime} onChange={e => setData({...formData, endTime: e.target.value})} />
            </div>
            <div className={styles.labelBaseStyle}>
              <Cloud size={12} style={{ marginRight: 4 }} /><label>天候</label>
            </div>
            <div style={radioFlexStyle}>
              {WEATHER_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, weather: opt})} style={{...radioBtnStyle, backgroundColor: formData.weather === opt ? '#e0f2fe' : '#fff', color: formData.weather === opt ? '#0369a1' : '#64748b', borderColor: formData.weather === opt ? '#38bdf8' : '#e2e8f0'}}> {opt}</button>))}
            </div>
          </InputTile>
        
          <InputTile label="潮汐" icon={Waves}>
            <div style={radioFlexStyle}>
              {TIDE_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, tide: opt})} style={{...radioBtnStyle, backgroundColor: formData.tide === opt ? '#e0f2fe' : '#fff', color: formData.tide === opt ? '#0369a1' : '#64748b', borderColor: formData.tide === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="潮流" icon={TrendingUpDown}>
            <div style={radioFlexStyle}>
              {CURRENT_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, current: opt})} style={{...radioBtnStyle, backgroundColor: formData.current === opt ? '#e0f2fe' : '#fff', color: formData.current === opt ? '#0369a1' : '#64748b', borderColor: formData.current === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="満潮時刻・高さ[cm]" icon={WavesArrowUp}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="time" style={editStyles.input}
                value={formData.highTideTime} onChange={e => setFormData({...formData, highTideTime: e.target.value})} />
              <input type="number" placeholder="高さ [cm]" style={editStyles.input}
                value={formData.highTide} onChange={e => setFormData({...formData, highTide: e.target.value})} />
              <span className={styles.unitTextStyle}>cm</span>
            </div>
          </InputTile>

          <InputTile label="波高（アウターリーフ）" icon={Activity}>
            <div style={radioFlexStyle}>
              {WAVE_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, waveOuter: opt})} style={{...radioBtnStyle, backgroundColor: formData.waveOuter === opt ? '#e0f2fe' : '#fff', color: formData.waveOuter === opt ? '#0369a1' : '#64748b', borderColor: formData.waveOuter === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="干潮時刻・高さ[cm]" icon={WavesArrowDown}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="time" style={editStyles.input}
                value={formData.lowTideTime} onChange={e => setFormData({...formData, lowTideTime: e.target.value})} />
              <input type="number" placeholder="高さ [cm]" style={editStyles.input}
                value={formData.lowTide} onChange={e => setFormData({...formData, lowTide: e.target.value})} />
              <span className={styles.unitTextStyle}>cm</span>
            </div>
          </InputTile>

          <InputTile label="波高（ショアゾーン）" icon={Activity}>
            <div style={radioFlexStyle}>
              {WAVE_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, wave: opt})} style={{...radioBtnStyle, backgroundColor: formData.wave === opt ? '#e0f2fe' : '#fff', color: formData.wave === opt ? '#0369a1' : '#64748b', borderColor: formData.wave === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="風向（天気予報）" icon={Compass} isExpandable={true}>
            <select style={editStyles.input} value={formData.windDir} onChange={e => setData({...formData, windDir: e.target.value})}>
              <option value="">風向</option>
              {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </InputTile>

          <InputTile label="風向（現地）" icon={Compass} isExpandable={true}>
            <select style={editStyles.input} value={formData.windDirDetail} onChange={e => setData({...formData, windDirDetail: e.target.value})}>
              <option value="">風向</option>
              {DIRECTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </InputTile>

          <InputTile label="風速（天気予報）" icon={Gauge}>
            <div style={radioFlexStyle}>
              {WIND_SPEED_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, windSpeed: opt})} style={{...radioBtnStyle, backgroundColor: formData.windSpeed === opt ? '#e0f2fe' : '#fff', color: formData.windSpeed === opt ? '#0369a1' : '#64748b', borderColor: formData.windSpeed === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

        <InputTile label="利用者数" icon={Users}>
            <div style={inputFlexStyle}>
              <input type="number" inputMode="numeric" className={styles.inputNumericStyle} value={formData.visitors} onChange={e => setFormData({...formData, visitors: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
            </div>
          </InputTile>

          <InputTile label="注意報" icon={WavesLadder} isExpandable={true}>
            <MultiSelectInput
              options={WARNIBG_OPTIONS2}
              value={formData.warn || []}
              onChange={(next) => setFormData({ ...formData, warn: next })}
              inputStyle={styles.inputMultiStyle}
              placeholder="注意報を選択"
            />
          </InputTile>

          <InputTile label="ビーチ利用の特徴" icon={WavesLadder} isExpandable={true}>
            <MultiSelectInput
              options={FEATURE_OPTIONS}
              value={formData.feature || []}
              onChange={(next) => setFormData({ ...formData, feature: next })}
              inputStyle={styles.inputMultiStyle}
              placeholder="特徴を選択"
            />
          </InputTile>

          <InputTile label="警報" icon={WavesLadder} isExpandable={true}>
            <MultiSelectInput
              options={ALERT_OPTIONS2}
              value={formData.alert || []}
              onChange={(next) => setFormData({ ...formData, alert: next })}
              inputStyle={styles.inputMultiStyle}
              placeholder="警報を選択"
            />
          </InputTile>

          <InputTile label="注意喚起人数" icon={Megaphone} isExpandable={true}>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label className={styles.labelLeftyStyle}>日本人県内在住</label>
              <label className={styles.labelLeftyStyle}>外国人県内在住</label>
            </div>
            <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input type="number" className={styles.inputNarrowStyle} value={formData.jpWarning} onChange={e => setFormData({...formData, jpWarning: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
              <input type="number" className={styles.inputNarrowStyle} value={formData.forWarning} onChange={e => setFormData({...formData, forWarning: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label className={styles.labelLeftyStyle}>日本人観光客</label>
              <label className={styles.labelLeftyStyle}>外国人観光客</label>
            </div>
            <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input type="number" className={styles.inputNarrowStyle} value={formData.jpTourist} onChange={e => setFormData({...formData, jpTourist: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
              <input type="number" className={styles.inputNarrowStyle} value={formData.forTourist} onChange={e => setFormData({...formData, forTourist: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
            </div>
          </InputTile>

          <InputTile label="車両情報" icon={NotebookPen} isExpandable={true}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      list="carType-options"
                      style={editStyles.input}
                      value={formData.someValue}
                      onChange={(e) => setData({ ...formData, carType: e.target.value })}
                      placeholder="車種名"
                    />
                    <datalist id="carType-options">
                      {CARTYPE.map((opt) => (
                        <option key={opt} value={opt} />
                      ))}
                    </datalist>
                    <input type="text" placeholder="No." style={editStyles.input} maxLength={4} inputMode="numeric"
                      value={formData.carNo} onChange={e => setData({...formData, carNo: e.target.value})} />
                  </div>
              <div className={styles.labelBaseStyle}>
                <Clock size={12} style={{ marginRight: 4 }} /><label>申し送り事項</label>
              </div>
            <textarea className={styles.inputNoteStyle} value={formData.handover} onChange={e => setFormData({...formData, handover: e.target.value})} />
            <div className={styles.labelBaseStyle}>
              <Cloud size={12} style={{ marginRight: 4 }} /><label>優先度</label>
            </div>
            <div style={radioFlexStyle}>
              {PRIORITY_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, priority: opt})} style={{...radioBtnStyle, backgroundColor: formData.priority === opt ? '#e0f2fe' : '#fff', color: formData.priority === opt ? '#0369a1' : '#64748b', borderColor: formData.priority === opt ? '#38bdf8' : '#e2e8f0'}}> {opt}</button>))}
            </div>
          </InputTile>

          <InputTile label="特記事項（応急手当・救助・その他）" icon={NotebookPen} isExpandable={true}>
            <textarea className={styles.inputNoteStyle} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
            <div className={styles.labelBaseStyle}>
              <Cloud size={12} style={{ marginRight: 4 }} /><label>画像のアップロード</label>
            </div>
          </InputTile>

     </main>

      <footer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <button onClick={handleClear} className={styles.deleteBtnStyle}>Unpatrolled</button>
            <button onClick={() => onSubmit(formData)} 
              icon: Construction size={18} className={styles.sendBtnStyle}>送信
          </button>
        </div>
      </footer>
    </div>

    </div>
  );
};

//const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' };
const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '8px' };
//const radioBtnStyle = { padding: '0px 6px', borderRadius: '4px', border: '1px solid', fontSize: '14px', fontWeight: '600', height: '20px' };
const radioBtnStyle = { padding: '4px 16px', borderRadius: '8px', border: '1px solid', fontSize: '14px', fontWeight: '600', cursor: 'pointer', textAlign: 'center', minWidth: '60px', transition: 'all 0.2s ease' };
const inputFlexStyle = { display: 'flex', flexWrap: 'noWrap', gap: '4px' };
const doneTextStyle = { backgroundColor: '#f3f4f6', padding: '4px 12px', borderRadius: '6px', fontSize: '9px', fontWeight: '600', border: '1px solid #d1d5db', display: 'inline-block' };
const logoTextStyle = { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' };

const editStyles = {
  input: { width: '100%', boxSizing: 'border-box', padding: '10px 12px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '8px', fontSize: '13px' },
};

export default EditView;

//            <select className={styles.inputStyle} value={formData.feature} onChange={e => setFormData({...formData, feature: e.target.value})}><option value="">- 選択 -</option>{FEATURE_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
//        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
//        </div>
//        </div>
//
//        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

//          <InputTile label="注意報・警報" icon={AlertCircle}>
//            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
//              <label className={styles.labelLeftyStyle}>注意報</label>
//              <label className={styles.labelLeftyStyle}>警報</label>
//            </div>
//            <div style={{ display: 'flex', gap: '6px' }}>
//              <select className={styles.inputStyle} value={formData.warn} onChange={e => setFormData({...formData, warn: e.target.value})}><option value="">- 選択 -</option>{WARNIBG_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
//              <select className={styles.inputStyle} value={formData.alert} onChange={e => setFormData({...formData, alert: e.target.value})}><option value="">- 選択 -</option>{ALERT_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
//            </div>
//          </InputTile>

//           <h3>{format(selectedDate, 'MM月dd日(EEE)の記録', { locale: ja })}</h3>

