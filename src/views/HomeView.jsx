import React from 'react';
import { Home, LifeBuoy, PencilLine, FileText, Megaphone, Menu } from 'lucide-react';
//import { useAuth } from '../contexts/authContext';
// ダミー
import { useAuth } from '../contexts/dummyAuthContext';
import { toast } from 'sonner';

function HomeView({ user, onNavigate }) {
  const { logout } = useAuth();

  const showConfirm = () => {
    toast('ログアウトしますか？', {
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

  const handleLogout = () => {
    console.log("Logout clicked");
    if (logout) {
      logout();
    }
  };

  return (
    <div style={styles.wrapper}>
      {/* ヘッダー */}
      <header style={styles.header}>
        <Menu color="white" size={28} />
        <div style={styles.logoGroup}>
          <div style={styles.logoCircle}></div>
          <h1 style={styles.logoText}>沖縄e-log</h1>
        </div>
        <div style={{ width: 28 }}></div> {/* バランス調整用空要素 */}
      </header>

      <main style={styles.main}>
        {/* お知らせPickUp */}
        <section style={styles.pickupCard}>
          {/*<h2 style={styles.cardTitle}>お知らせPickUp</h2>*/}
        </section>

        {/* 集計データ領域 */}
        <section style={styles.statsCard}>
        </section>

        <button onClick={showConfirm} style={styles.logoutButton}>
          <span>ログアウト</span>
        </button>

      </main>

      {/* ナビゲーションフッター */}
      <nav style={styles.footer}>
        <button onClick={() => onNavigate('home')} style={styles.navItem}>
          <Home size={24} /><span>ホーム</span>
        </button>
        <button style={styles.navItem}>
          <LifeBuoy size={24} /><span>救助登録</span>
        </button>
        <button onClick={() => onNavigate('list')} style={styles.navItem}>
          <div style={styles.mainCircle}>
            <PencilLine size={24} />
            <span style={{ fontSize: '10px', marginTop: '2px' }}>新規登録</span>
          </div>
        </button>
        {/*<button onClick={() => onNavigate('records')} style={styles.navItem}>*/}
        <button style={styles.navItem}>
          <FileText size={24} /><span>記録一覧</span>
        </button>
        <button style={styles.navItem}>
          <Megaphone size={24} /><span>お知らせ</span>
        </button>
      </nav>
    </div>
  );
}

const styles = {
  wrapper: { backgroundColor: '#e5e7eb', minHeight: '100vh', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto' },
  header: { backgroundColor: '#44445A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: 'white', fontSize: '20px', fontWeight: 'bold' },
  main: { padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '100px', overflowY: 'auto'},
  pickupCard: { backgroundColor: 'white', borderRadius: '24px 24px 24px 24px', padding: '20px', minHeight: '150px' },
  statsCard: { backgroundColor: 'white', borderRadius: '24px', padding: '20px', flex: 1 },
  cardTitle: { fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' },
//  footer: { backgroundColor: '#44445A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', position: 'fixed', bottom: 0, width: '100%', color: 'white', maxWidth: '804px', margin: '0 auto' },
  footer: { backgroundColor: '#44445A', height: '80px', display: 'flex', justifyContent: 'space-around', alignItems: 'center', bottom: 0, width: '100%', color: 'white', maxWidth: '804px', margin: '0 auto' },
  navItem: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  navItemMain: { position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'none', border: 'none', color: 'white', fontSize: '10px' },
  logoutButton: { padding: '4px 8px', backgroundColor: '#cccccc', color: '#1a1a1a', border: 'none', borderRadius: '8px', fontSize: '14px', width: '160px', height: '30px', marginleft: '8px' },
//  mainCircle: { position: 'absolute', width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#44445A', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column', top: '0px' }
  mainCircle: { width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#44445A', border: '2px solid #e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', flexDirection: 'column', top: '0px' }

};

export default HomeView;

//        <button onClick={() => onNavigate('list')} style={styles.navItemMain}>
//          <div style={styles.mainCircle}><PencilLine size={28} /></div>
//          <span style={{marginTop: '40px'}}>新規登録</span>
//        </button>
