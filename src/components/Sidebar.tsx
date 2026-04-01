

interface SidebarProps {
  activeMenu: string;
  setActiveMenu: (menu: string) => void;
  userRole: string;
  userName: string;
  onLogout: () => void;
}

const MENU_GROUPS = [
  {
    title: '一、核心基础模块 (Foundation)',
    items: [
      { id: '首页看板', icon: '📊', desc: '总览与经营报表', roles: ['admin', 'financial', 'doctor', 'frontdesk', 'nurse'] },
      { id: '智能挂号排队', icon: '🎫', desc: 'Scheduling', roles: ['admin', 'frontdesk'] },
      { id: '医生排班', icon: '👨‍⚕️', desc: '跨店护盘', roles: ['admin', 'financial', 'frontdesk', 'doctor'] }
    ]
  },
  {
    title: '二、临床医疗模块 (Clinical)',
    items: [
      { id: '宠物档案与CRM', icon: '🐾', desc: '一主多宠', roles: ['admin', 'doctor', 'frontdesk'] },
      { id: '电子病历(SOAP)', icon: '📝', desc: 'e-Prescribing', roles: ['admin', 'doctor'] },
      { id: '化验与影像(PACS)', icon: '🩻', desc: 'LIS集成/DICOM', roles: ['admin', 'doctor'] },
      { id: '住院与手术', icon: '🏥', desc: '白板生命体征', roles: ['admin', 'doctor', 'nurse'] }
    ]
  },
  {
    title: '三、经营与供应链 (Supply)',
    items: [
      { id: '收银结算', icon: '💰', desc: '组合计费/保险', roles: ['admin', 'financial', 'frontdesk'] },
      { id: '智能库存', icon: '📦', desc: '批次回溯/核销', roles: ['admin', 'financial', 'nurse', 'doctor'] }
    ]
  },
  {
    title: '四、进阶与AI网络 (Advanced)',
    items: [
      { id: 'AI辅助医疗', icon: '🤖', desc: '自动扩写/初筛', roles: ['admin', 'doctor'] },
      { id: '远程音视频问诊', icon: '💻', desc: 'Telemedicine', roles: ['admin', 'doctor', 'frontdesk'] },
      { id: 'IoT物联网监控', icon: '📡', desc: '智能项圈/病房温湿', roles: ['admin', 'doctor', 'nurse'] }
    ]
  },
  {
    title: '五、系统安全配置 (Admin Only)',
    items: [
      { id: '账号与鉴权管理', icon: '🔐', desc: 'IAM通行证与RBAC提权', roles: ['admin'] }
    ]
  }
];

const getRoleKeys = (roleStr: string) => {
  const keys: string[] = [];
  if (roleStr.includes('系统管')) keys.push('admin');
  if (roleStr.includes('报表') || roleStr.includes('财务')) keys.push('financial');
  if (roleStr.includes('医生')) keys.push('doctor');
  if (roleStr.includes('前台')) keys.push('frontdesk');
  if (roleStr.includes('护士')) keys.push('nurse');
  if (keys.length === 0) keys.push('frontdesk'); // Fallback
  return keys;
};

export default function Sidebar({ activeMenu, setActiveMenu, userRole, userName, onLogout }: SidebarProps) {
  
  const currentRoleKeys = getRoleKeys(userRole);

  return (
    <div className="sidebar" style={{ backgroundColor: '#ffffff', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', overflowY: 'auto' }}>
      <div className="logo-area" style={{ padding: '24px 20px', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: '1.4rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏥 宠爱之城 HIS
        </h1>
        <div style={{ marginTop: '12px', padding: '12px', background: 'var(--bg-app)', borderRadius: '12px' }}>
          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{userName}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
            {userRole.split(' | ').map(r => (
               <span key={r} className="badge" style={{ background: 'var(--primary-light)', color: 'var(--primary)', display: 'inline-block', fontSize: '0.7rem' }}>{r.replace(/ \(.+\)/, '')}</span>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px', cursor: 'pointer', textDecoration: 'underline' }} onClick={onLogout}>安全注销通行证</p>
        </div>
      </div>
      
      <div className="menu-list" style={{ padding: '20px 12px', flex: 1 }}>
        {MENU_GROUPS.map(group => {
          // Filter items based on RBAC exact roles
          const visibleItems = group.items.filter(item => item.roles.some(r => currentRoleKeys.includes(r) || currentRoleKeys.includes('admin')));
          
          if (visibleItems.length === 0) return null; // Hide entirely if group has no accessible menus

          return (
            <div key={group.title} style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', paddingLeft: '12px' }}>
                {group.title}
              </h4>
              {visibleItems.map(item => (
                 <div 
                   key={item.id}
                   className={`menu-item ${activeMenu === item.id ? 'active' : ''}`}
                   onClick={() => setActiveMenu(item.id)}
                   style={{ 
                     display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', borderRadius: '12px',
                     cursor: 'pointer', transition: 'all 0.2s', marginBottom: '4px'
                   }}
                 >
                   <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
                   <div>
                     <span style={{ fontWeight: 500, display: 'block' }}>{item.id}</span>
                     <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.desc}</span>
                   </div>
                 </div>
              ))}
            </div>
          )
        })}
      </div>
      
      <div style={{ padding: '20px', borderTop: '1px solid var(--border)' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
           <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
           RBAC 当前已鉴权
         </div>
      </div>
    </div>
  );
}
