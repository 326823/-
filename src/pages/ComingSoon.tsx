import React from 'react';

interface ComingSoonProps {
  title: string;
  icon: string;
  desc: string;
  onGoHome: () => void;
}

export default function ComingSoon({ title, icon, desc, onGoHome }: ComingSoonProps) {
  return (
    <div className="empty-state animate-slide-up">
      <span>{icon}</span>
      <h3>{title}功能正在开发中</h3>
      <p>{desc}，敬请期待后续系统更新与模块接入。</p>
      <button className="btn-secondary" style={{ marginTop: '24px' }} onClick={onGoHome}>返回首页看板</button>
    </div>
  );
}
