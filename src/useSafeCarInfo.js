// 車両名を返す
import React from 'react';
import { useAuth } from './contexts/authContext';

export function useSafeCarInfo() {
  const { carInfo } = useAuth();

  const safeCarInfo = React.useMemo(() => {
    if (carInfo && carInfo.length > 0) return carInfo;
    const saved = localStorage.getItem('auth_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.carInfo || [];
      } catch (e) {
        return [];
      }
    }
    return [];
  }, [carInfo]);

  return safeCarInfo;
}