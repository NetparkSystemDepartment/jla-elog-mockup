// エリアを返す
import React from 'react';

export function useAreaInfo(authType) {

  const areaInfo = React.useMemo(() => {
    const saved = localStorage.getItem('auth_data');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const rawAreaInfo = parsed.master_info?.area_info || [];

      // 引数の authType と一致するものだけを抽出
      // 0は全エリアを返す
      const filtered = rawAreaInfo.filter(item => {
        if (authType === 0) return true;
        return item.auth_type === authType;
      });
      // orderby の昇順（小さい順）で並び替え
      const sorted = [...filtered].sort((a, b) => a.orderby - b.orderby);

      const formatted = sorted.map(item => ({
        no: item.no,      // id (no) をそのまま no として格納
        name: item.area   // area を name として格納
      }));

      return formatted;    } catch (e) {
      console.error('Failed to parse auth_data', e);
      return [];
    }
  }, [authType]);

  return areaInfo;
}

// ビーチを返す
export function useBeachInfo(areaNo) {

  const beachInfo = React.useMemo(() => {
    const saved = localStorage.getItem('auth_data');
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      const rawAreaInfo = parsed.master_info?.area_info || [];

      // 引数で指定された areaNo と一致するエリアを1つ見つける
      const targetArea = rawAreaInfo.find(item => item.no === areaNo);
      
      // 対象のエリアがない、または beach_info が空なら空配列を返す
      if (!targetArea || !targetArea.beach_info) return [];

      // 2. そのエリアが持つ beach_info を orderby の昇順（小さい順）で並び替え
      const sorted = [...targetArea.beach_info].sort((a, b) => a.orderby - b.orderby);

      // 3. 出力形式を { no, name } の形に変換する
      const formatted = sorted.map(item => ({
        no: item.no,
        name: item.beach
      }));

      return formatted;
    } catch (e) {
      console.error('Failed to parse auth_data', e);
      return [];
    }
  }, [areaNo]);

  return beachInfo;
}