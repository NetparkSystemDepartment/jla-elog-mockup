import React, { useState } from 'react';
import { Menu, ChevronLeft, ChevronRight, Users, 
  Calendar as CalendarIcon,
  AlertCircle, CheckCircle2, ChevronUp, ChevronDown, PlusCircle, 
  Home, Printer, ClipboardList, Bell, Construction } from 'lucide-react';
import { LifeBuoy, PencilLine, FileText, Megaphone } from 'lucide-react';

import DatePicker, { registerLocale } from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, addDays, subDays, isAfter, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';
registerLocale('ja', ja);
import '../Overwrite.css';
import { toast } from 'sonner';
import { COAST_DATA, ONNA_BEACHES } from '../constantsPublic';

//const COAST_DATA = [
//  { id: 1, name: '本島北部(西)', kind: 1 }, { id: 2, name: '本島北部(東)', kind: 1 },
//  { id: 3, name: '恩納村', kind: 1 }, { id: 4, name: '東海岸中部', kind: 1 },
//  { id: 5, name: '本島中部', kind: 1 }, { id: 6, name: '本島南部', kind: 1 }, { id: 7, name: '座間味村', kind: 2 },
//  { id: 8, name: '渡嘉敷村', kind: 2 }
//];
//const ONNA_BEACHES = ['裏真栄田ビーチ', '仲泊ビーチ', '冨着ビーチ', '谷茶ビーチ', 'アボガマ', 'ダイヤモンドビーチ', 'なかゆくい', '安富祖ビーチ'];
//const ONNA_BEACHES = ['裏真栄田ビーチ', 'アボガマ', '希望ヶ丘ビーチ'];

const ListView = ({ user, baseDate, setBaseDate, selectedDate, setSelectedDate, savedRecords, onSelectBeach, onSelectCoast, onNavigate }) => {
  const [isEnrolledExpanded, setIsEnrolledExpanded] = useState(false);
  const totalVisitors = 0; 
  const UNREGISTEREDBEACH = 3; 
  const today = startOfDay(new Date());

  const handleSelect = (coast) => {
    onSelectCoast(coast.name);

    // 恩納村なら、ビーチメニューを開閉
    if (coast.name === '恩納村') {
      setIsEnrolledExpanded(!isEnrolledExpanded);
    }
  };

  const CustomInput = React.forwardRef(({ onClick }, ref) => (
    <button onClick={onClick} ref={ref} style={iconBtnStyle}><CalendarIcon size={22} color="#38bdf8" /></button>
  ));

//  console.log('user', user);
//  const filteredCoasts = user.kind === 1
//    ? COAST_DATA.filter((coast) => coast.kind === 1)
//    : COAST_DATA
  let filteredCoasts = COAST_DATA;  
  if (user.kind === 1) {
    filteredCoasts = COAST_DATA.filter((coast) => coast.kind === 1);
  } else if (user.kind === 2) {
    filteredCoasts = COAST_DATA.filter((coast) => coast.kind === 2);
  }
//  console.log('filteredCoasts:', filteredCoasts);

  return (
    <div style={container}>
      <header style={headerStyle}>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"></meta>
        <div style={headerTopStyle}>
              <Menu color="#38bdf8" size={20} />
              <button onClick={() => setBaseDate(subDays(baseDate, 7))} style={iconBtnStyle}><ChevronLeft size={20} /></button>
              <span style={monthTextStyle}>{format(baseDate, 'yyyy年 M月', { locale: ja })}</span>
              <button onClick={() => {
                const nextDate = addDays(baseDate, 7);
                setBaseDate(isAfter(nextDate, today) ? today : nextDate); } }
              style={iconBtnStyle}><ChevronRight size={20} /></button>
              <DatePicker selected={selectedDate} onChange={(d) => { setBaseDate(d); setSelectedDate(d); }} maxDate={today} locale='ja' customInput={<CustomInput />} withPortal />
        </div>

        <div style={dateRowStyle}>
          {Array.from({ length: 7 }, (_, i) => subDays(baseDate, i)).filter(d => !isAfter(d, baseDate)).reverse().map((d) => {
            const isSel = format(d, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');
            const dayName = format(d, 'E', { locale: ja });
            return (
              <button key={d.toString()} onClick={() => setSelectedDate(d)} style={{ ...dateBtnBaseStyle, backgroundColor: isSel ? '#38bdf8' : 'rgba(255,255,255,0.3)', 
               color: isSel ? '#0f172a' : (dayName === '日' ? '#FF8080' : (dayName === '土' ? '#70AAFF' : '#fff')),}}>
                <span style={{ fontSize: '16px', fontWeight: 'bold' }}>{format(d, 'd')}</span>
                <span style={{ fontSize: '11px' }}>{dayName}</span>
              </button>
            );
          })}
        </div>
      </header>

      <main style={mainStyle}>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {filteredCoasts.map((coast) => {

            const isOnna = coast.name === '恩納村';
            const isExpanded = isOnna && isEnrolledExpanded;

            const unregisteredCount = isOnna ? (UNREGISTEREDBEACH - savedRecords.length) : UNREGISTEREDBEACH;

            return (
              <div key={coast.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                  <div style={coastNameTextStyle}>{coast.name}</div>
                  <button onClick={() => handleSelect(coast)}  style={compactSelectBtnStyle}>ビーチを選択</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={infoRowStyle}><AlertCircle size={12} color={unregisteredCount > 0 ? "#f87171" : "#10b981"} /><span style={{...infoTextStyle, color: unregisteredCount > 0 ? "#ef4444" : "#10b981"}}>本日未登録箇所: {unregisteredCount}箇所</span></div>
                </div>
                {isExpanded && (
                  <div style={beachListStyle}>
                    {ONNA_BEACHES.map(beach => {
                      const isDone = savedRecords.some(r => r.beach === beach.name);
                      return (
                        <button key={beach.name} onClick={() => onSelectBeach(beach.name)} style={{...beachOptionStyle, backgroundColor: isDone ? '#f1f5f9' : '#f0f9ff'}}>
                          <span style={{flex:1, textAlign:'left'}}>{beach.name}</span>
                          {isDone && (
  <                         div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={doneTextStyle}>未送信</span>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </main>
 
      {/* ナビゲーションフッター */}
      <nav style={footerStyles.footer}>
        <button onClick={() => onNavigate('home')} style={footerStyles.navItem}>
          <Home size={24} /><span>ホーム</span>
        </button>
        <button style={footerStyles.navItem}>
          <LifeBuoy size={24} /><span>救助登録</span>
        </button>
        <button style={footerStyles.navItem}>
          <div style={footerStyles.mainCircle}>
            <PencilLine size={24} />
            <span style={{ fontSize: '10px', marginTop: '2px' }}>新規登録</span>
          </div>
        </button>
        <button style={footerStyles.navItem}>
          <FileText size={24} /><span>記録一覧</span>
        </button>
        <button style={footerStyles.navItem}>
          <Megaphone size={24} /><span>お知らせ</span>
        </button>
      </nav>

      </div>




  );
};

// CSS
const container = { maxWidth: '820px', margin: '0 auto', width: '100%', minHeight: '100vh', position: 'relative', backgroundColor: '#f1f5f9' };
const headerStyle = { backgroundColor: '#08172A', width: '100%', position: 'sticky', top: '0', zIndex: '100' };
const headerTopStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px' };
const monthTextStyle = { fontWeight: 'bold', fontSize: '15px', color: '#fff', minWidth: '95px', textAlign: 'center' };
const dateRowStyle = { display: 'flex', overflowX: 'auto', gap: '8px', padding: '0 16px 12px', justifyContent: 'space-evenly' };
//const dateBtnBaseStyle = { flex: '0 0 42px', height: '42px', borderRadius: '10px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
//const cardStyle = { backgroundColor: '#fff', padding: '12px', borderRadius: '12px', height: '58px' };
const infoRowStyle = { display: 'flex', alignItems: 'center', gap: '4px' };
const beachListStyle = { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid #f1f5f9', paddingTop: '10px' };
const coastNameTextStyle = { fontSize: '16px', fontWeight: 'bold', color: '#1e293b', flex: '1' };
const compactSelectBtnStyle = { padding: '4px 8px', backgroundColor: '#0284c7', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px' };
const iconBtnStyle = { background: 'none', border: 'none', color: '#fff' };

//const navTextStyle = { fontSize: '10px', fontWeight: '500' };
const mainStyle = { padding: '12px', minHeight: '78vh' };
const infoTextStyle = { fontSize: '14px', color: '#64748b', marginTop: '4px' };
const dateBtnBaseStyle = { flex: '0 0 42px', height: '42px', borderRadius: '10px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' };
const beachOptionStyle = { width: '100%', padding: '10px', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' };
const doneTextStyle = { backgroundColor: '#d1fae5', color: '#065f46', fontSize: '12px', padding: '2px 8px', borderRadius: '9999px', fontWeight: 'bold', display: 'inline-flex', alignItems: 'center' };

const footerStyles = {
//  footer: { backgroundColor: '#44445A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', bottom: 0, width: '100%', color: 'white', maxWidth: '804px', margin: '0 auto' },
  footer: { backgroundColor: '#08172A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', bottom: 0, width: '100%', color: 'white', maxWidth: '820px', margin: '0 auto' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  navItemMain: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  mainCircle: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#08172A', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column', top: '0px' }
};

export default ListView;
