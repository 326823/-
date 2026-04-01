import React, { useState } from 'react';

interface LoginProps {
  onLogin: (role: string, name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return alert('请输入账号密码');
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      // 真实后端验证
      const res = await fetch(`https://houduan-hlb1.onrender.com/users?username=${username}&password=${password}`);
      const data = await res.json();
      
      if (data && data.length > 0) {
        const user = data[0];
        // 赋予对应权限
        setTimeout(() => {
          onLogin(user.role, user.name);
          setLoading(false);
        }, 500);
      } else {
        setErrorMsg('账号或密码不正确，请重新输入');
        setLoading(false);
      }
    } catch (err) {
      setErrorMsg('系统网络异常，请检查后端服务是否启动');
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)', fontFamily: 'Inter, sans-serif'
    }}>
      <div className="card animate-slide-up" style={{
        width: '100%', maxWidth: '400px', padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚕️</div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', fontWeight: 800 }}>宠爱之城 HIS 互联中心</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>请凭企业通行证登录进行身份校验</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="input-group">
            <label style={{ fontWeight: 600 }}>工号 / 登录名</label>
            <input 
              type="text" 
              value={username} onChange={e => setUsername(e.target.value)} 
              placeholder="例如：admin / doctor1 / front1" 
              style={{ fontSize: '1rem', padding: '12px' }}
            />
          </div>

          <div className="input-group">
            <label style={{ fontWeight: 600 }}>验证密码</label>
            <input 
              type="password" 
              value={password} onChange={e => setPassword(e.target.value)} 
              placeholder="初始密码：123" 
              style={{ fontSize: '1rem', padding: '12px' }}
            />
          </div>

          {errorMsg && (
            <div style={{ padding: '10px', background: '#FEF2F2', color: '#DC2626', fontSize: '0.85rem', borderRadius: '8px', textAlign: 'center' }}>
               {errorMsg}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '14px', fontSize: '1.05rem', marginTop: '10px' }} disabled={loading}>
            {loading ? '服务器校验中...' : '安全登录入系统'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
           © 2026 PetCare Enterprise HIS. <br/>受系统管理员审计及安全监控
        </div>
      </div>
    </div>
  );
}
