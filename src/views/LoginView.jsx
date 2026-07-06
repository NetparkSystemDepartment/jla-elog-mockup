import React, { useState } from 'react';
import { User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
// Context API を使用する
import { useAuth } from '../contexts/authContext';
import { getinfoApi } from '../api/recordApi';
import oslLogo from '../assets/ola-S.png';
import okinawaLogo from '../assets/okinawa.png';

function LoginView() {
  //const { login } = useAuth(); // Contextからlogin関数を取り出す
  const { login, isPending } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // エラーメッセージ用の状態
  // パスワードマスク状態
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // 毎回リセットする
    setError('');

    // バリデーション
    if (!loginId.trim()) {
      setError('ユーザーIDを入力してください。');
      return;
    }
    if (isAdmin && !password.trim()) {
      setError('パスワードを入力してください。');
      return;
    }

    // ログイン関数を呼ぶ
    const result = await login({
      id: loginId, 
      password: isAdmin ? password : null 
    });
//console.log('result', result);
     // authContextから返ってきたメッセージをセットする  
    if (!result.success) {
      setError(result.message);
    }
    else {
      // Local Strageのブリーフィングデータ
      // 昨日以前の日付ならば削除
      // 当日でもログイン者
      const savedData = localStorage.getItem('briefing_data');
      if (savedData) {
        try {
          const parsed = JSON.parse(savedData);

          // 今日の日付かどうか判断
          const isExist = Boolean(parsed.timestamp);
          let isToday = false;
          if (isExist) {
            const savedTimestamp = Number(parsed.timestamp);
            const savedDate = new Date(savedTimestamp);
            const today = new Date();

            isToday = 
              savedDate.getFullYear() === today.getFullYear() &&
              savedDate.getMonth() === today.getMonth() &&
              savedDate.getDate() === today.getDate();
          }
          if (isExist) {
            if (!isToday) {
              // Local Strageを削除
              localStorage.removeItem('briefing_data');
              console.log('Local Strageのbriefing_dataを削除しました（昨日以前データ）');
            }

            const savedLogin = parsed.id || []; 
            if ( savedLogin !== loginId) {
              parsed.id = "" 
              parsed.members = [];
              localStorage.setItem('briefing_data', JSON.stringify(parsed));
      
              console.log('Local Storageのbriefing_dataのidとmembersをクリアしました（ログイン者違い）');              
            }  
          }
        } catch (e) {
          console.error('ローカルストレージのデータ解析に失敗:', e);
        }
      }

//console.log('１週分のデータをローカルストレージへ');
      const requestBody = {
        type: 2,
      };

      const resData = await getinfoApi(requestBody);
//console.log('resData:', resData);      

      if (resData && Array.isArray(resData.data)) {

        // 基準となる「7日前」の日付文字列（YYYY-MM-DD形式）を作成
        const d = new Date();
        d.setDate(d.getDate() - 6); // 今日を含めて7日間（6日前まで）
  
        // '2026-05-21' のようなフォーマットに変換
        const sevenDaysAgoStr = d.toISOString().split('T')[0]; 

        // 7日前より新しい（＝直近1週間分の）データだけにフィルターをかける
        const weeklyFilteredData = resData.data.filter(item => {
        // 文字列同士の比較（ex. '2026-05-28' >= '2026-05-22'）
          return item.startDate >= sevenDaysAgoStr;
        });

        // 必要な項目だけを抽出する
        const weeklyData = weeklyFilteredData.map(item => ({
          startDate: item.startDate,
          detail_key: item.detail_key,
          area: item.area,
          beach: item.beach
        }));

        try {
          // ローカルストレージに保存
          localStorage.setItem('weeklyBeachData', JSON.stringify(weeklyData));
  //console.log(`直近1週間分（${sevenDaysAgoStr}以降）のデータを保存しました（${weeklyData.length}件）`, weeklyData);
        } catch (error) {
          console.error('ローカルストレージへの保存に失敗しました:', error);
        }

      } else {
        console.warn('resData.data が取得できませんでした。');
      }
    }
  };

  // ログイン画面
  return (
    <div style={loginStyles.wrapper}>
      <header style={loginStyles.header}>
        <div style={loginStyles.logoGroup}>
          <img src={oslLogo} alt="OLA logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          <h1 style={loginStyles.logoText}>沖縄県elogシステム</h1>
          <img src={okinawaLogo} alt="Okinawa prefecture logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
        </div>
      </header>

      <main style={loginStyles.container}>
        <div style={loginStyles.card}>
          
          <form onSubmit={handleSubmit}>
            <div style={loginStyles.inputContainer}>
              <label style={loginStyles.label}>
                ログインID（記録担当者）
              </label>
              <div style={loginStyles.inputWrapper}>
                <User size={18} style={loginStyles.icon} />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="ログインID"
                  style={loginStyles.input}
                />
              </div>
            </div>

            {isAdmin && (
              <div style={loginStyles.inputContainer}>
                <label style={loginStyles.label}>パスワード</label>
                <div style={loginStyles.inputWrapper}>
                  <Lock size={18} style={loginStyles.icon} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                    style={{
                      ...loginStyles.input,
                      paddingRight: '40px' // アイコンと文字が重ならないように右側に余白を作ります
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={loginStyles.eyeButton}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

          {/* エラーメッセージ表示領域 */}
          {error && (
            <div style={loginStyles.errorBox}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

            {/*
            <button type="submit" style={loginStyles.loginButton}>
              ログイン
            </button>
            */}
            <button 
              type="submit" 
              style={{
                ...loginStyles.loginButton,
                // 通信中はボタンの色を少しグレーっぽくして、カーソルを禁止マークにする
                backgroundColor: isPending ? '#9ca3af' : '#44445A',
                cursor: isPending ? 'not-allowed' : 'pointer'
              }}
              disabled={isPending} // 通信中はクリックできないようにする（連打防止）
            >
              {isPending ? 'ログイン中...' : (isAdmin ? '管理者ログイン' : 'ログイン')}
            </button>

          </form>

          <p style={loginStyles.contactText}>
            ログインIDに関するお問い合わせは、沖縄LS協会e-log担当<br />
            (098-800-2574)までご連絡ください。
          </p>

          <div style={loginStyles.footer}>
            <button 
              onClick={() => {
                setIsAdmin(!isAdmin);
                setPassword('');
                setError(''); // 切り替え時にエラーもクリア
              }} 
              style={loginStyles.switchButton}
            >
              {isAdmin ? '監視員はこちら' : '管理者はこちら'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

const loginStyles = {
  // ...既存のスタイル...
  wrapper: { height: '100dvh', backgroundColor: '#e5e7eb', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: { backgroundColor: '#08172A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '4px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' },
  container: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', 
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  card: { backgroundColor: '#ffffff', width: '100%', maxWidth: '380px', borderRadius: '24px', padding: '30px 30px 40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  
  // エラーボックスのスタイル
  errorBox: {
    backgroundColor: '#fef2f2', // 薄い赤
    color: '#b91c1c',           // 濃い赤
    padding: '12px 16px',
    borderRadius: '12px',
    fontSize: '13px',
    fontWeight: 'bold',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid #fecaca'
  },

  inputContainer: { marginBottom: '20px', textAlign: 'left' },
  label: { display: 'block', fontSize: '12px', fontWeight: 'bold', color: '#374151', marginBottom: '8px' },
  inputWrapper: { position: 'relative', display: 'flex', alignItems: 'center', width: '100%' },
  icon: { position: 'absolute', left: '12px', color: '#9ca3af' },
  input: { width: '100%', boxSizing: 'border-box', padding: '14px 14px 14px 40px', backgroundColor: '#f3f4f6', border: 'none', borderRadius: '12px', fontSize: '14px' },
  loginButton: { width: '100%', padding: '16px', backgroundColor: '#08172A', color: '#ffffff', border: 'none', borderRadius: '40px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', marginBottom: '30px' },
  contactText: { fontSize: '11px', color: '#4b5563', textAlign: 'center', lineHeight: '1.6', marginBottom: '25px' },
  footer: { borderTop: '1px solid #f3f4f6', paddingTop: '20px', textAlign: 'center' },
  switchButton: { background: 'none', border: 'none', color: '#1d4ed8', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' },
  eyeButton: { position: 'absolute', right: '10px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center',
    justifyContent: 'center', color: '#666', padding: '4px', outline: 'none', },
};

export default LoginView;