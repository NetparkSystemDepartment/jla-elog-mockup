// src/theme.js

export const COLORS = {
  navy: '#1e293b',    // ヘッダーやナビ
  primary: '#0284c7', // メインの青色
  accent: '#38bdf8',  // 水色（アイコンなど）
  bg: '#f1f5f9',      // 背景の薄いグレー
  white: '#ffffff',
  textMain: '#1e293b',
  textMuted: '#64748b',
  danger: '#ef4444',
  success: '#10b981',
  border: '#e2e8f0'
};

export const COMMON_STYLES = {
  // 丸角タイル
  card: {
    backgroundColor: COLORS.white,
    borderRadius: '12px',
    padding: '12px',
    border: `1px solid ${COLORS.border}`,
  },
  // アイコンとテキストの横並び
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  // 入力フォームの共通スタイル
  input: {
    width: '100%',
    padding: '4px',
    borderRadius: '4px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '12px',
    height: '30px',
    backgroundColor: '#fcfcfc',
    color: COLORS.textMain,
    boxSizing: 'border-box'
  },
  // ヘッダー
  header: {
    backgroundColor: COLORS.navy,
    width: '100%',
    position: 'sticky',
    top: 0,
    zIndex: 100
  }
};