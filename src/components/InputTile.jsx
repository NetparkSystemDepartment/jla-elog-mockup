// src/components/InputTile.jsx
import React from 'react';

// props を使って、ラベル、アイコン、中身(children)を受け取ります
const InputTile = ({ label, icon: Icon, children, isExpandable }) => {

// スタイルもこちらに移動して App.jsx を軽くします
const tileStyle = { 
  backgroundColor: '#fff', 
  padding: '8px', 
  borderRadius: '10px', 
  border: '1px solid #e2e8f0', 
  display: 'flex', 
  flexDirection: 'column', 
  gap: '4px', 
  //height: '58px',
  height: isExpandable ? 'auto' : '58px',
  minHeight: '58px', // どちらにせよ最低 58px は保つ
};

const labelBaseStyle = { 
  fontSize: '10px', 
  fontWeight: 'bold', 
  color: '#64748b',
  display: 'flex',
  alignItems: 'center'
};

  return (
    <div style={tileStyle}>
      <label style={labelBaseStyle}>
        {Icon && <Icon size={12} style={{ marginRight: 4 }} />}
        {label}
      </label>
      {children}
    </div>
  );

}

export default InputTile;