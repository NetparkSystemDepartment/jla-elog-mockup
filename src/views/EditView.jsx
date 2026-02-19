import React, { useState, useEffect } from 'react';
import { X, Save, Clock, Cloud, Wind, Users, Gauge, Waves, Droplets, AlertCircle, User, 
  WavesArrowUp, WavesArrowDown, Compass, TrendingUpDown, Activity, WavesLadder, Megaphone, 
  NotebookPen, ChevronLeft } from 'lucide-react';
import InputTile from '../components/InputTile';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import styles from './EditView.module.css';
import { toast } from 'sonner';
import { Construction } from 'lucide-react';

const WEATHER_OPTIONS = ['晴', '曇り', '雨', '雷雨'];
const WIND_SPEED_OPTIONS = ['0～4m/s', '5～10m/s', '11m/s～'];
const TIDE_OPTIONS = ['大潮', '中潮', '小潮', '長潮', '若潮'];
const CURRENT_OPTIONS = ['下げ潮', '上げ潮'];
const WAVE_OPTIONS = ['0～0.5m', '0.6～1m', '1.1～1.5m', '1.6m～'];
const DIRECTIONS = ['北', '北北東', '北東', '東北東', '東', '東南東', '南東', '南南東', '南', '南南西', '南西', '西南西', '西', '西北西', '北西', '北北西'];
const WARNIBG_OPTIONS = ['なし', '大雨', '洪水', '強風', '風雪', '波浪', '高潮', '雷', '濃霧'];
const ALERT_OPTIONS = ['なし', '大雨', '洪水', '暴風', '暴風雪', '波浪', '高潮'];
const FEATURE_OPTIONS = ['海水浴', 'マリンスポーツ', 'ビーチスポーツ', 'BBQ', '散策', '遊具遊び', 'イベント'];

const initialFormData = {
  startTime: '', member: '', weather: '', windSpeed: '', tide: '', 
  highTide: '', lowTide: '', current: '', windDir: '', windDirDetail: '', 
  wave: '', warn: '', alert: '', visitors: '', feature: '', 
  jpWarning: '', forWarning: '', note: ''
};

const EditView = ({ selectedCoast, selectedBeach, selectedDate, onSave, onBack, existingData, beach, setView }) => {
  const [formData, setFormData] = useState(initialFormData);

  // 既存データがあればフォームにセット
  useEffect(() => {
    if (existingData) setFormData(existingData);
  }, [existingData]);

  // 全ての入力を削除
  const handleClear = () => {
    setFormData(initialFormData);
 };

  return (
    <div className={styles.container}>
    <div className="notranslate">
      <header>
        <div className={styles.headerTopStyle}>
          {/*<div className={styles.dummyStyle} ></div>*/}
          <button onClick={onBack} className={styles.circleBtnStyle}><ChevronLeft size={20} /></button>
           <h3>{format(selectedDate, 'MM月dd日(EEE)の記録', { locale: ja })}</h3>
          <button onClick={() => onSave(formData)} className={styles.saveBtnStyle} >保存して閉じる</button>
        </div>
        <div className={styles.headerMiddleStyle}>{selectedCoast}</div>
        <div className={styles.headerBottomStyle}>
          <h3>{selectedBeach}</h3>
          <span>パトロール未実施</span>
        </div>
      </header>

      <main style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '8px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <InputTile label="パトロール開始時間" icon={Clock}>
            <input type="time" value={formData.startTime} onChange={e => setFormData({...formData, startTime: e.target.value})} />
          </InputTile>
        
          <InputTile label="パトロールメンバー" icon={User}>
            <select className={styles.inputStyle} value={formData.member} onChange={e => setFormData({...formData, member: e.target.value})}><option value="">- 選択 -</option><option>担当A</option><option>担当B</option><option>担当C</option></select>
            <button className={styles.memberBtnStyle} 
              onClick={() => toast.info("この機能は本バージョンではサポートされていません。", {icon: <Construction size={18} />})}>メンバーを追加</button>
          </InputTile>

          <InputTile label="天候" icon={Cloud}>
            <div style={radioFlexStyle}>
              {WEATHER_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, weather: opt})} style={{...radioBtnStyle, backgroundColor: formData.weather === opt ? '#e0f2fe' : '#fff', color: formData.weather === opt ? '#0369a1' : '#64748b', borderColor: formData.weather === opt ? '#38bdf8' : '#e2e8f0'}}> {opt}</button>))}
            </div>
          </InputTile>

          <InputTile label="風速（天気予報の値）" icon={Gauge}>
            <div style={radioFlexStyle}>
              {WIND_SPEED_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, windSpeed: opt})} style={{...radioBtnStyle, backgroundColor: formData.windSpeed === opt ? '#e0f2fe' : '#fff', color: formData.windSpeed === opt ? '#0369a1' : '#64748b', borderColor: formData.windSpeed === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="潮汐" icon={Waves}>
            <div style={radioFlexStyle}>
              {TIDE_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, tide: opt})} style={{...radioBtnStyle, backgroundColor: formData.tide === opt ? '#e0f2fe' : '#fff', color: formData.tide === opt ? '#0369a1' : '#64748b', borderColor: formData.tide === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="満潮時(cm)" icon={WavesArrowUp}>
            <div style={radioFlexStyle}>
              <input type="number" inputMode="numeric" className={styles.inputNumericStyle} value={formData.highTide} onChange={e => setFormData({...formData, highTide: e.target.value})} />
              <span className={styles.unitTextStyle}>cm</span>
             </div>
          </InputTile>

          <InputTile label="干潮時(cm)" icon={WavesArrowDown}>
            <div style={radioFlexStyle}>
              <input type="number" inputMode="numeric" className={styles.inputNumericStyle} value={formData.lowTide} onChange={e => setFormData({...formData, lowTide: e.target.value})} />
              <span className={styles.unitTextStyle}>cm</span>
            </div>
          </InputTile>

          <InputTile label="潮流" icon={TrendingUpDown}>
            <div style={radioFlexStyle}>
              {CURRENT_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, current: opt})} style={{...radioBtnStyle, backgroundColor: formData.current === opt ? '#e0f2fe' : '#fff', color: formData.current === opt ? '#0369a1' : '#64748b', borderColor: formData.current === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <InputTile label="風向" icon={Wind}>
            <select className={styles.inputStyle} value={formData.windDir} onChange={e => setFormData({...formData, windDir: e.target.value})}><option value="">- 選択 -</option>{DIRECTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </InputTile>

          <InputTile label="風向き" icon={Compass}>
            <select className={styles.inputStyle} value={formData.windDirDetail} onChange={e => setFormData({...formData, windDirDetail: e.target.value})}><option value="">- 選択 -</option>{DIRECTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </InputTile>

          <InputTile label="波高" icon={Activity}>
            <div style={radioFlexStyle}>
              {WAVE_OPTIONS.map(opt => (<button key={opt} onClick={() => setFormData({...formData, wave: opt})} style={{...radioBtnStyle, backgroundColor: formData.wave === opt ? '#e0f2fe' : '#fff', color: formData.wave === opt ? '#0369a1' : '#64748b', borderColor: formData.wave === opt ? '#38bdf8' : '#e2e8f0'}}>{opt}</button>))}
             </div>
          </InputTile>

          <InputTile label="注意報・警報" icon={AlertCircle}>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label className={styles.labelLeftyStyle}>注意報</label>
              <label className={styles.labelLeftyStyle}>警報</label>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <select className={styles.inputStyle} value={formData.warn} onChange={e => setFormData({...formData, warn: e.target.value})}><option value="">- 選択 -</option>{WARNIBG_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
              <select className={styles.inputStyle} value={formData.alert} onChange={e => setFormData({...formData, alert: e.target.value})}><option value="">- 選択 -</option>{ALERT_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
            </div>
          </InputTile>

          <InputTile label="利用者数" icon={Users}>
            <div style={radioFlexStyle}>
              <input type="number" inputMode="numeric" className={styles.inputNumericStyle} value={formData.visitors} onChange={e => setFormData({...formData, visitors: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
            </div>
          </InputTile>

          <InputTile label="ビーチ利用の特徴" icon={WavesLadder}>
            <select className={styles.inputStyle} value={formData.feature} onChange={e => setFormData({...formData, feature: e.target.value})}><option value="">- 選択 -</option>{FEATURE_OPTIONS.map(o => <option key={o}>{o}</option>)}</select>
          </InputTile>

          <InputTile label="注意喚起人数" icon={Megaphone}>
            <div style={{ display: 'flex', justifyContent: 'space-evenly', gap: '6px' }}>
              <label className={styles.labelLeftyStyle}>日本人</label>
              <label className={styles.labelLeftyStyle}>外国人</label>
            </div>
            <div style={{ display: 'flex', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <input type="number" className={styles.inputNarrowStyle} value={formData.jpWarning} onChange={e => setFormData({...formData, jpWarning: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
              <input type="number" className={styles.inputNarrowStyle} value={formData.forWarning} onChange={e => setFormData({...formData, forWarning: e.target.value})} />
              <label className={styles.unitTextStyle}>名</label>
            </div>
          </InputTile>

          <InputTile label="特記事項（応急手当・救助・その他）" icon={NotebookPen}>
            <textarea className={styles.inputNoteStyle} value={formData.note} onChange={e => setFormData({...formData, note: e.target.value})} />
          </InputTile>

        </div>

     </main>

      <footer>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
          <button onClick={handleClear} className={styles.deleteBtnStyle}>全ての入力を削除する</button>
            <button onClick={() => toast.info("この機能は本バージョンではサポートされていません。", {
              icon: <Construction size={18} />})}className={styles.sendBtnStyle}>送信
          </button>
        </div>
      </footer>
    </div>

    </div>
  );
};

const radioFlexStyle = { display: 'flex', flexWrap: 'wrap', gap: '4px' };
const radioBtnStyle = { padding: '0px 6px', borderRadius: '4px', border: '1px solid', fontSize: '10px', fontWeight: '600', height: '20px' };

export default EditView;