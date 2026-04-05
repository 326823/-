import React, { useState, useEffect } from 'react';

const API_URL = 'https://houduan-hlb1.onrender.com/users';
const REQ_API_URL = 'https://houduan-hlb1.onrender.com/registration_requests';

interface AccountManagementProps {
  userRole?: string;
}

export default function AccountManagement({ userRole }: AccountManagementProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ username: '', password: '', name: '', role: '主治医生' });

  // Security Gate
  const isSuperAdmin = userRole && userRole.includes('系统管');

  useEffect(() => {
    if (isSuperAdmin) {
      fetchData();
    }
  }, [isSuperAdmin]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, reqRes] = await Promise.all([
        fetch(API_URL),
        fetch(REQ_API_URL).catch(() => ({ ok: false, json: () => [] })) // Safe fallback if DB doesn't have it
      ]);
      
      if (usersRes.ok) setUsers(await usersRes.json());
      if (reqRes.ok) setPendingRequests(await reqRes.json());
      else setPendingRequests([]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: any) => {
    if (!window.confirm(`确认批准并创建账号 [${req.username}] 吗？`)) return;
    try {
      // 1. Create the user
      const createRes = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: req.username,
          password: req.password,
          name: req.name,
          role: req.role
        })
      });
      
      if (!createRes.ok) throw new Error("Failed to create user");
      const newUser = await createRes.json();

      // 2. Delete the request
      await fetch(`${REQ_API_URL}/${req.id}`, { method: 'DELETE' });

      // 3. Update local state
      setUsers([...users, newUser]);
      setPendingRequests(pendingRequests.filter(r => r.id !== req.id));

    } catch (err) {
      alert("审批通过时发生错误，请重试！");
    }
  };

  const handleReject = async (id: string | number) => {
    if (!window.confirm("确认要驳回并删除这条注册申请吗？")) return;
    try {
      await fetch(`${REQ_API_URL}/${id}`, { method: 'DELETE' });
      setPendingRequests(pendingRequests.filter(r => r.id !== id));
    } catch (err) {
      alert("废弃申请时发生错误！");
    }
  };

  const openModal = (user?: any) => {
    if (user) {
      setEditingId(user.id);
      setFormData({ username: user.username, password: user.password, name: user.name, role: user.role });
    } else {
      setEditingId(null);
      setFormData({ username: '', password: '', name: '', role: '主治医生' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        // Edit 
        const res = await fetch(`${API_URL}/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) {
          const updated = await res.json();
          setUsers(users.map(u => u.id === editingId ? updated : u));
        }
      } else {
        // Create 
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (res.ok) setUsers([...users, await res.json()]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("保存失败，请检查网络！");
    }
  };

  const handleDelete = async (id: number, username: string) => {
    if (username === 'admin') return alert('系统自带的超级管理员不可删除！');
    if (window.confirm(`确认要吊销并彻底删除账号 [${username}] 吗？这种权限操作不可逆！`)) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        setUsers(users.filter(u => u.id !== id));
      } catch (err) {
        alert("删除失败！");
      }
    }
  };

  const getRoleBadgeColor = (role: string = '') => {
    if (role.includes('系统管')) return 'var(--danger)';
    if (role.includes('医生')) return 'var(--primary)';
    if (role.includes('财务')) return 'var(--warning)';
    if (role.includes('护士')) return 'var(--success)';
    return 'var(--secondary)';
  };

  if (!isSuperAdmin) {
    return (
      <div className="empty-state animate-slide-up" style={{ height: '70vh' }}>
        <span style={{ fontSize: '4rem', opacity: 1, filter: 'grayscale(100%)' }}>🔒</span>
        <h3 style={{ color: 'var(--danger)', marginTop: '20px' }}>非法越权访问拦截</h3>
        <p>系统审计记录已生成。只有高级系统管理员有权进入此面板配置。</p>
      </div>
    );
  }

  return (
    <>
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="table-toolbar" style={{ marginBottom: '16px' }}>
          <div>
            <h2 className="page-title">内网通行证与权限审计 (SSO IAM)</h2>
            <p style={{ color: 'var(--text-muted)' }}>只有高级系统管理员有权进入此面板配置员工门禁与角色的鉴权账号，并审核注册申请。</p>
          </div>
          <button className="btn-primary" onClick={() => openModal()}>➕ 新建账号分配权限</button>
        </div>

        {/* 审批流区块 */}
        {pendingRequests.length > 0 && (
          <div className="card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ⚠️ 待审批的注册申请 <span className="badge" style={{ background: '#FEF3C7', color: 'var(--warning)' }}>{pendingRequests.length}</span>
            </h3>
            <table className="data-grid">
               <thead>
                   <tr>
                       <th>申请账号</th>
                       <th>实名信息</th>
                       <th>申请角色</th>
                       <th>申请时间</th>
                       <th>联合审批操作</th>
                   </tr>
               </thead>
               <tbody>
                  {pendingRequests.map(req => (
                    <tr key={req.id} style={{ background: 'var(--warning)05' }}>
                      <td style={{ fontWeight: 600 }}>{req.username}</td>
                      <td>{req.name}</td>
                      <td>
                        <span className="badge" style={{ background: 'var(--bg-app)', color: 'var(--text-main)', border: '1px solid var(--border)' }}>
                          {req.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {req.createdAt ? new Date(req.createdAt).toLocaleString() : '未知时间'}
                      </td>
                      <td>
                         <button className="btn-secondary" style={{ marginRight: '8px', padding: '4px 12px', fontSize: '0.8rem', background: '#ECFDF5', color: '#10B981', borderColor: '#A7F3D0' }} onClick={() => handleApprove(req)}>✅ 同意接纳</button>
                         <button className="btn-icon danger" style={{ fontSize: '0.8rem', padding: '4px 12px', width: 'auto' }} onClick={() => handleReject(req.id)}>❌ 驳回拦截</button>
                      </td>
                    </tr>
                  ))}
               </tbody>
            </table>
          </div>
        )}

        <div className="card">
           <div style={{ marginBottom: '16px' }}>
             <h3 style={{ fontSize: '1.1rem' }}>活跃的通行证账户树</h3>
           </div>
           <table className="data-grid">
               <thead>
                   <tr>
                       <th>唯一 UID</th>
                       <th>系统登录名</th>
                       <th>实名认证</th>
                       <th>SSO 授权主责角色 (RBAC)</th>
                       <th>明文密码 (仅管可见)</th>
                       <th>权限门禁审计操作</th>
                   </tr>
               </thead>
               <tbody>
                  {loading ? <tr><td colSpan={6}>数据加载中...</td></tr> : 
                    users.map(u => (
                      <tr key={u.id}>
                        <td style={{ color: 'var(--text-muted)' }}># {u.id}</td>
                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                        <td>{u.name}</td>
                        <td>
                          <span className="badge" style={{ 
                            background: getRoleBadgeColor(u.role) + '22', 
                            color: getRoleBadgeColor(u.role) 
                          }}>{u.role}</span>
                        </td>
                        <td style={{ letterSpacing: '2px', color: 'var(--text-muted)' }}>{u.password}</td>
                        <td>
                           <button className="btn-secondary" style={{ marginRight: '8px', padding: '4px 12px', fontSize: '0.8rem' }} onClick={() => openModal(u)}>配置修改</button>
                           {u.username !== 'admin' && (
                             <button className="btn-icon danger" style={{ fontSize: '0.8rem', padding: '4px 12px', width: 'auto', background: '#FEF2F2', color: '#EF4444' }} onClick={() => handleDelete(u.id, u.username)}>撤销吊销</button>
                           )}
                           {u.username === 'admin' && <span style={{fontSize:'0.75rem', color:'#aaa', marginLeft: '6px'}}>系统根基</span>}
                        </td>
                      </tr>
                  ))}
               </tbody>
           </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal">
             <div className="modal-header">
                <h2>{editingId ? '⚙️ 修改配置系统账号' : '🔐 签发新登录门禁账号'}</h2>
                <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
             </div>
             <form onSubmit={handleSave}>
               <div className="modal-body">
                 <div className="form-row">
                    <div className="input-group">
                       <label>登录账号 (英文字母)</label>
                       <input autoFocus value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} type="text" placeholder="例如 zhangsan" required />
                    </div>
                    <div className="input-group">
                       <label>初始登录密码</label>
                       <input value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} type="text" placeholder="默认 123" required />
                    </div>
                 </div>
                 
                 <div className="input-group">
                    <label>真实持有人姓名 (Name)</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="签署档案实名" required />
                 </div>
                 
                 <div className="input-group">
                    <label>底层读写角色授权 (允许多选跨界兼任)</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', background: 'var(--bg-app)', padding: '12px', borderRadius: '8px' }}>
                       {[
                         { id: '系统管理员 (全权限)', label: '👑 系统管理员' },
                         { id: '院办财务 (报表权限)', label: '📈 院办财务' },
                         { id: '主治医生 (处方权限)', label: '👨‍⚕️ 主治医生' },
                         { id: '前台导诊 (挂号权限)', label: '👩‍💼 前台导诊' },
                         { id: '护士 (护理记录权限)', label: '💉 护士中心' }
                       ].map(r => (
                         <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                           <input 
                             type="checkbox" 
                             checked={formData.role.includes(r.id)}
                             onChange={(e) => {
                               let currentRoles = formData.role ? formData.role.split(' | ') : [];
                               if (e.target.checked) {
                                  if (!currentRoles.includes(r.id)) currentRoles.push(r.id);
                               } else {
                                  currentRoles = currentRoles.filter((cr: string) => cr !== r.id);
                               }
                               setFormData({ ...formData, role: currentRoles.join(' | ') || '前台导诊 (挂号权限)' });
                             }}
                             style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                           />
                           <span style={{ fontSize: '0.9rem' }}>{r.label}</span>
                         </label>
                       ))}
                    </div>
                 </div>
                 <p style={{ fontSize: '0.8rem', color: '#6366f1', marginTop: '10px' }}>⚠️ 核心提示：赋予这几种身份的叠加映射后，该用户登录的侧边栏将会并行展开所有其被授权的模块（如前台兼职护士可同时看到挂号和病床）。</p>
               </div>
               <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>放弃签署</button>
                  <button type="submit" className="btn-primary">💾 {editingId ? '保存权限变动' : '生成系统门禁'}</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </>
  );
}
