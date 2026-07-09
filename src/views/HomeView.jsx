import React from 'react';
import { Menu } from 'lucide-react';

import { useAuth } from '../contexts/authContext';
import { hasUnsyncedRecords } from '../db';

import { toast } from 'sonner';

import oslLogo from '../assets/ola-S.png';
import oslBigLogo from '../assets/ola.png';
import okinawaLogo from '../assets/okinawa.png';

function HomeView({ user, onNavigate }) {
  const { logout } = useAuth();

  const showConfirm = async () => {
    // 未送信データがあるかどうかをチェック
    const hasUnsynced = await hasUnsyncedRecords();

    // 条件によってメッセージを切り替える
    const message = hasUnsynced
      ? <div>未送信のデータがあります。<br />本当にログアウトしてもよいですか？</div>
      : 'ログアウトしますか？';

    // トーストを表示
    toast(message, {
      action: {
        label: '実行',
        onClick: () => {
          logout();
        },
      },
      cancel: {
        label: 'キャンセル',
        onClick: () => console.log('キャンセルされました'),
      },
    });
  };

  return (
    <div style={styles.wrapper}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <Menu color="white" size={28} />
        <div style={styles.logoGroup}>
          <img src={oslLogo} alt="OLA logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <h1 style={styles.logoText}>沖縄県elogシステム</h1>
          <img src={okinawaLogo} alt="Okinawa prefecture logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        </div>
        <div style={{ width: 28 }}></div> {/* バランス調整用空要素 */}
      </header>

      <main style={styles.main}>

        {/* スペーサー */}
        <div style={{ flex: 1 }} />

        {/* ロゴ表示エリア */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img src={oslBigLogo} alt="OLS logo" style={{ width: '400px', height: 'auto' }} />
        </div>

        {/* スペーサー */}
        <div style={{ flex: 1 }} />

        {/* ログアウトボタン */}
        <button onClick={showConfirm} style={styles.logoutButton}>
          <span>ログアウト</span>
        </button>

      </main>

    </div>
  );
}

const styles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100dvh', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: { backgroundColor: '#08172A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: 'white', fontSize: '20px', fontWeight: 'bold' },
  main: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '20px', overflowY: 'auto',
  },
  pickupCard: { backgroundColor: 'white', borderRadius: '24px 24px 24px 24px', padding: '20px', minHeight: '150px' },
  statsCard: { backgroundColor: 'white', borderRadius: '24px', padding: '20px', flex: 1 },
  cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' },
//  footer: { backgroundColor: '#44445A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'fixed', bottom: 0, width: '100%', color: 'white', maxWidth: '804px', margin: '0 auto' },
  footer: { backgroundColor: '#08172A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', bottom: 0, width: '100%', color: 'white', maxWidth: '820px', margin: '0 auto' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  navItemMain: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  logoutButton: { padding: '4px 8px', backgroundColor: '#cccccc', color: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '14px', width: '160px', height: '30px', marginleft: '8px' },
//  mainCircle: { position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#44445A', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column', top: '0px' }
  mainCircle: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#08172A', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column', top: '0px' }

};

export default HomeView;
