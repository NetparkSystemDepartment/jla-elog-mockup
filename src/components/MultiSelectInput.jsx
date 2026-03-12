import React, { useState } from 'react';

// JSX用：型定義を削除して、よりシンプルにしました
export const MultiSelectInput = ({ options = [], value = [], onChange, placeholder, inputStyle }) => {
  const [isOpen, setIsOpen] = useState(false);

  // 変更時の処理
  const handleToggle = (name, checked) => {
    const nextValue = checked 
      ? [...value, name]
      : value.filter(n => n !== name);
    onChange(nextValue);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* 選択中の表示エリア（既存のスタイルを適用） */}
      <div 
        className={inputStyle} 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          cursor: 'pointer', minHeight: '20px', display: 'flex', 
          alignItems: 'center', flexWrap: 'wrap', gap: '6px', padding: '4px 8px' , height: 'auto',
          maxHeight: '100px'
        }}
      >
        {value.length > 0 ? (
          value.map(m => (
            <span key={m} style={{ background: '#e0e0e0', padding: '2px 8px', borderRadius: '12px', fontSize: '12px', color: '#333' }}>
              {m}
            </span>
          ))
        ) : (
          <span style={{ color: '#aaa' }}>{placeholder || '- 選択 -'}</span>
        )}
      </div>

      {/* 選択肢のリスト（開いている時だけ表示） */}
      {isOpen && (
        <>
          {/* メニューの外をタップして閉じるための透明な背景 */}
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
            onClick={() => setIsOpen(false)} 
          />
          
          <div style={{ 
            position: 'absolute', top: '105%', left: 0, width: '100%', background: 'white', 
            border: '1px solid #ddd', borderRadius: '8px', zIndex: 100, padding: '8px', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)', maxHeight: '200px', overflowY: 'auto' 
          }}>
            {options.map(name => (
              <label key={name} style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', borderBottom: '1px solid #f0f0f0', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={value.includes(name)}
                  onChange={(e) => handleToggle(name, e.target.checked)}
                  style={{ width: '16px', height: '16px', marginRight: '10px' }}
                /> 
                {name}
              </label>
            ))}
            <button 
              onClick={() => setIsOpen(false)} 
              style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', fontWeight: 'bold' }}
            >
              閉じる
            </button>
          </div>
        </>
      )}
    </div>
  );
};

