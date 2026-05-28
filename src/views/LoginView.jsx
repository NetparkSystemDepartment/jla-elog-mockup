import React, { useState } from 'react';
import { User, Lock, AlertCircle } from 'lucide-react';
// Context API を使用する
import { useAuth } from '../contexts/authContext';
import { getinfoApi } from '../api/recordApi';

function LoginView() {
  //const { login } = useAuth(); // Contextからlogin関数を取り出す
  const { login, isPending } = useAuth();
  const [loginId, setLoginId] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(''); // エラーメッセージ用の状態

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
//console.log('１週分のデータをローカルストレージへ');
      const requestBody = {
        type: 1,
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
          beach: item.beach
        }));

        try {
          // ローカルストレージに保存
          localStorage.setItem('weeklyBeachData', JSON.stringify(weeklyData));
//  console.log(`直近1週間分（${sevenDaysAgoStr}以降）のデータを保存しました（${weeklyData.length}件）`, weeklyData);
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
          <div style={loginStyles.logoCircle}></div>
          <h1 style={loginStyles.logoText}>沖縄e-log</h1>
        </div>
      </header>

      <main style={loginStyles.container}>
        <div style={loginStyles.card}>
          
          <form onSubmit={handleSubmit}>
            <div style={loginStyles.inputContainer}>
              <label style={loginStyles.label}>
                ユーザーID{isAdmin ? '' : '（記録担当者）'}
              </label>
              <div style={loginStyles.inputWrapper}>
                <User size={18} style={loginStyles.icon} />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="ユーザーID"
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
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="パスワード"
                    style={loginStyles.input}
                  />
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
            ユーザーIDに関するお問い合わせは、沖縄LS協会e-log担当<br />
            (090-0000-0000)までご連絡ください。
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
  wrapper: { height: '100vh', backgroundColor: '#e5e7eb', display: 'flex', flexDirection: 'column', maxWidth: '820px', margin: '0 auto' },
  header: { backgroundColor: '#08172A', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  logoGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoCircle: { width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#6b7280' },
  logoText: { color: '#ffffff', fontSize: '20px', fontWeight: 'bold' },
  container: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px' },
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
  switchButton: { background: 'none', border: 'none', color: '#1d4ed8', fontSize: '13px', textDecoration: 'underline', cursor: 'pointer' }
};

export default LoginView;