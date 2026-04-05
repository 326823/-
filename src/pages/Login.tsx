import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface LoginProps {
  onLogin: (role: string, name: string) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('前台导诊'); // 默认选项

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return setErrorMsg('请输入账号密码');
    
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');
    
    try {
      if (isRegister) {
        if (!name) {
          setErrorMsg('请填写真实姓名');
          setLoading(false);
          return;
        }

        // 发送注册申请到后端审批表
        await fetch('https://houduan-hlb1.onrender.com/registration_requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            username, 
            password, 
            name, 
            role, 
            status: 'PENDING',
            createdAt: new Date().toISOString()
          })
        });

        setSuccessMsg('注册申请已提交，等待超级管理员审核');
        setLoading(false);
        
        // 3秒后跳回登录
        setTimeout(() => {
          setIsRegister(false);
          setSuccessMsg('');
        }, 3000);
        
      } else {
        // 登录逻辑
        const res = await fetch(`https://houduan-hlb1.onrender.com/users?username=${username}&password=${password}`);
        const data = await res.json();
        
        if (data && data.length > 0) {
          const user = data[0];
          setTimeout(() => {
            onLogin(user.role, user.name);
            setLoading(false);
          }, 500);
        } else {
          setErrorMsg('账号或密码不正确，请重新输入');
          setLoading(false);
        }
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
        width: '100%', maxWidth: '420px', padding: '40px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.08)', borderRadius: '24px', background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
        transition: 'height 0.3s ease'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⚕️</div>
          <h1 style={{ fontSize: '1.6rem', color: 'var(--text-main)', fontWeight: 800 }}>宠爱之城 HIS 互联中心</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '8px' }}>
            {isRegister ? '申请企业通行证账号进行注册' : '请凭企业通行证登录进行身份校验'}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div className="input-group">
            <label style={{ fontWeight: 600 }}>登录名 / 工号</label>
            <input 
              type="text" 
              value={username} onChange={e => setUsername(e.target.value)} 
              style={{ fontSize: '1rem', padding: '12px' }}
            />
          </div>

          <div className="input-group">
            <label style={{ fontWeight: 600 }}>密码</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} onChange={e => setPassword(e.target.value)} 
                style={{ fontSize: '1rem', padding: '12px', width: '100%', paddingRight: '46px' }}
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ 
                  position: 'absolute', right: '12px', background: 'transparent', border: 'none', 
                  padding: 0, color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' 
                }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="input-group">
                <label style={{ fontWeight: 600 }}>真实姓名</label>
                <input 
                  type="text" 
                  value={name} onChange={e => setName(e.target.value)} 
                  style={{ fontSize: '1rem', padding: '12px' }}
                />
              </div>

              <div className="input-group">
                <label style={{ fontWeight: 600 }}>申请角色</label>
                <select 
                  value={role} onChange={e => setRole(e.target.value)}
                  style={{ fontSize: '1rem', padding: '12px', background: 'var(--bg-surface)' }}
                >
                  <option value="前台导诊">前台导诊</option>
                  <option value="医师">医师</option>
                  <option value="护士">护士</option>
                  <option value="管理人员">管理人员</option>
                </select>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="animate-slide-up" style={{ padding: '10px', background: '#FEF2F2', color: '#DC2626', fontSize: '0.85rem', borderRadius: '8px', textAlign: 'center' }}>
               {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="animate-slide-up" style={{ padding: '10px', background: '#ECFDF5', color: '#10B981', fontSize: '0.85rem', borderRadius: '8px', textAlign: 'center' }}>
               {successMsg}
            </div>
          )}

          <button type="submit" className="btn-primary" style={{ padding: '14px', fontSize: '1.05rem', marginTop: '10px' }} disabled={loading}>
            {loading ? '处理中...' : (isRegister ? '提交注册申请' : '安全登录入系统')}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.9rem' }}>
          <button 
            type="button" 
            onClick={() => {
              setIsRegister(!isRegister);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontWeight: 600, padding: 0 }}
          >
            {isRegister ? '已有账号？返回登录' : '没有账号？申请注册'}
          </button>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
           © 2026 PetCare Enterprise HIS. <br/>受系统管理员审计及安全监控
        </div>
      </div>
    </div>
  );
}
