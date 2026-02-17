import React, { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, Users, 
  Calendar as CalendarIcon,
  AlertCircle, CheckCircle2, ChevronUp, ChevronDown, PlusCircle, 
  Home, Printer, ClipboardList, Bell, Construction } from 'lucide-react';
import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
import '../Overwrite.css';
import styles from './ListView.module.css';
import { toast, Toaster } from 'sonner';

const COAST_DATA = [
  { id: 1, name: '本島北部(西)' }, { id: 2, name: '本島北部(東)' },
  { id: 3, name: '恩納村' }, { id: 4, name: '東海岸中部' },
  { id: 5, name: '本島中部' }, { id: 6, name: '本島南部' }, { id: 7, name: '座間味村' },
];
const ONNA_BEACHES = ['裏真栄田ビーチ', '仲泊ビーチ', '冨着ビーチ', '谷茶ビーチ', 'アボガマ', 'ダイヤモンドビーチ', 'なかゆくい', '安富祖ビーチ'];

const ListView = ({ baseDate, setBaseDate, selectedDate, setSelectedDate, savedRecords, onSelectBeach, onSelectCoast }) => {
  const [isEnrolledExpanded, setIsEnrolledExpanded] = useState(false);
  const totalVisitors = 10; 
  const unregisteredCount = 0; 
  const today = startOfDay(new Date());

  const handleSelect = (coast) => {
    onSelectCoast(coast.name);

    // 恩納村なら、ビーチメニューを開閉
    if (coast.name === '恩納村') {
      setIsEnrolledExpanded(!isEnrolledExpanded);
    }
  };

  const CustomInput = React.forwardRef(({ onClick }, ref) => (
    <button onClick={onClick} ref={ref} className={styles.iconBtnStyle}><CalendarIcon size={22} color="#38bdf8" /></button>
  ));

  return (
    <div className={styles.container}>
      <header className={styles.headerStyle}>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
        <div className={styles.headerTopStyle}>
              <Menu color="#38bdf8" size={20} />
              <button onClick={() => setBaseDate(subDays(baseDate, 7))} className={styles.iconBtnStyle}><ChevronLeft size={20} /></button>
              <span className={styles.monthTextStyle}>{format(baseDate, 'yyyy年 M月', { locale: ja })}</span>
              <button onClick={() => {
                const nextDate = addDays(baseDate, 7);
                setBaseDate(isAfter(nextDate, today) ? today : nextDate); } }
              className={styles.iconBtnStyle}><ChevronRight size={20} /></button>
              <DatePicker selected={selectedDate} onChange={(d) => { setBaseDate(d); setSelectedDate(d); }} maxDate={today} locale="ja" customInput={<CustomInput />} withPortal />
        </div>

        <div className={styles.dateRowStyle}>
          {Array.from({ length: 7 }, (_, i) => subDays(baseDate, i)).filter(d => !isAfter(d, baseDate)).reverse().map((d) => {
            const isSel = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const dayName = format(d, 'E', { locale: ja });
            return (
              <button key={d.toString()} onClick={() => setSelectedDate(d)} style={{ ...dateBtnBaseStyle, backgroundColor: isSel ? '#38bdf8' : 'rgba(255,255,255,0.3)', 
               color: isSel ? '#0f172a' : (dayName === '日' ? '#CC2222' : (dayName === '土' ? '#2222CC' : '#fff')),}}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{format(d, 'd')}</span>
                <span style={{ fontSize: '11px' }}>{dayName}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main style={{ padding: '12px' }}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {COAST_DATA.map((coast) => {

            const isOnna = coast.name === '恩納村';
            const isExpanded = isOnna && isEnrolledExpanded;

            return (
              <div key={coast.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px', height: '58px;' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div className={styles.coastNameTextStyle}>{coast.name}</div>
                  <button onClick={() => handleSelect(coast)}  className={styles.compactSelectBtnStyle}>ビーチを選択</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div className={styles.infoRowStyle}><Users size={12} color="#64748b" /><span style={infoTextStyle}>現在の来訪者数: {totalVisitors}人</span></div>
                  <div className={styles.infoRowStyle}><AlertCircle size={12} color={unregisteredCount > 0 ? "#f87171" : "#10b981"} /><span style={{...infoTextStyle, color: unregisteredCount > 0 ? "#ef4444" : "#10b981"}}>本日未登録箇所: {unregisteredCount}箇所</span></div>
                </div>
                {isExpanded && (
                  <div className={styles.beachListStyle}>
                    {ONNA_BEACHES.map(beach => {
                      const isDone = savedRecords.some(r => r.beach === beach);
                      return (
                        <button key={beach} onClick={() => onSelectBeach(beach)} style={{...beachOptionStyle, backgroundColor: isDone ? '#f1f5f9' : '#f0f9ff'}}>
                          <span style={{flex:1, textAlign:'left'}}>{beach}</span>
                          {isDone && <CheckCircle2 size={12} color="#10b981" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          })}
          <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-end', padding: '12px', height: '58px' }}>
          <Toaster />
            <button onClick={() => toast.info("この機能は本バージョンではサポートされていません。", {
              icon: <Construction size={18} />})}className={styles.sendBtnStyle}>一括送信する</button>
          </div>
        </div>
      </main>
 
        <nav className={styles.bottomNavStyle}>
           <div className={styles.navItemStyle}><Home size={22} /><span className={styles.navTextStyle}>ホーム</span></div>
           <div className={styles.navItemStyle}><Printer size={22} /><span className={styles.navTextStyle}>印刷</span></div>
           <div className={styles.navItemStyle}><PlusCircle size={24} /><span className={styles.navTextStyle}>新規登録</span></div>
           <div className={styles.navItemStyle}><ClipboardList size={22} /><span className={styles.navTextStyle}>記録管理</span></div>
           <div className={styles.navItemStyle}><Bell size={22} /><span className={styles.navTextStyle}>お知らせ</span></div>
        </nav>
      </div>



  );
};

const infoTextStyle = { fontSize: '10px', color: '#64748b', marginTop: '4px' };
const dateBtnBaseStyle = { flex: '0 0 42px', height: '42px', borderRadius: '10px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const beachOptionStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '11px', fontWeight: 'bold', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' };

export default ListView;