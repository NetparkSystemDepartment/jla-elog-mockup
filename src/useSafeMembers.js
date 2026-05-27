// パトロールメンバーを返す
import React from 'react';
import { useAuth } from './contexts/authContext';

export function useSafeMembers() {
  const { members } = useAuth();
  const safeMembers = React.useMemo(() => {
    if (members && members.length > 0) return members;
  
    const saved = localStorage.getItem('auth_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const exceptLogin = parsed.members || []; // JSONの中の members 配列
        // ログイン者以外を返す
 //       return exceptLogin.filter((member, index) => (member !== user.id));;
        return exceptLogin;
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [members]);

  return safeMembers;
}
