

interface DashboardProps {
  onNavigate?: (menu: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  return (
    <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Metrics */}
      <div className="dashboard-grid">
        <div className="card stat-item">
          <div className="stat-content">
            <p className="label">今日就诊宠物</p>
            <h3 className="value">42</h3>
            <span className="trend up">↗ +12% 较昨日</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#EEF2FF', color: '#4F46E5' }}>🐾</div>
        </div>
        <div className="card stat-item">
          <div className="stat-content">
            <p className="label">正在治疗中</p>
            <h3 className="value">16</h3>
            <span className="trend down">↘ -2 较上周</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#FEF2F2', color: '#EF4444' }}>🩺</div>
        </div>
        <div className="card stat-item">
          <div className="stat-content">
            <p className="label">本月新增会员</p>
            <h3 className="value">128</h3>
            <span className="trend up">↗ +5% 较上月</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#ECFDF5', color: '#10B981' }}>💳</div>
        </div>
        <div className="card stat-item">
          <div className="stat-content">
            <p className="label">病房满载率</p>
            <h3 className="value">78%</h3>
            <span className="trend up">正常范围</span>
          </div>
          <div className="stat-icon-wrap" style={{ background: '#FFFBEB', color: '#F59E0B' }}>🏥</div>
        </div>
      </div>

      {/* Main Stats Area */}
      <div className="bento-grid">
        <div className="card">
          <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>近七日就诊接单趋势</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>展示各类宠物的挂号和接诊数量统计趋势。</p>
          <div className="chart-placeholder">
            <div className="bar" style={{ height: '40%' }}></div>
            <div className="bar" style={{ height: '60%' }}></div>
            <div className="bar" style={{ height: '45%' }}></div>
            <div className="bar" style={{ height: '80%' }}></div>
            <div className="bar" style={{ height: '70%' }}></div>
            <div className="bar" style={{ height: '95%' }}></div>
            <div className="bar" style={{ height: '50%' }}></div>
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.1rem' }}>医生今日排班概览</h3>
          {[
            { doctor: '王医生 (内科)', hours: '09:00 - 18:00', status: '接诊中' },
            { doctor: '李医生 (外科)', hours: '13:00 - 21:00', status: '准备中' },
            { doctor: '周医生 (异宠)', hours: '09:00 - 15:00', status: '接诊中' },
            { doctor: '陈医生 (皮肤科)', hours: '休息', status: '休息' },
          ].map(d => (
            <div key={d.doctor} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--divider)'}}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '0.95rem' }}>{d.doctor}</p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d.hours}</p>
              </div>
              <span className={`badge`} style={{ background: d.status === '休息' ? '#F1F5F9' : '#ECFDF5', color: d.status === '休息' ? '#64748B' : '#10B981' }}>{d.status}</span>
            </div>
          ))}
          <button className="btn-secondary" style={{ marginTop: 'auto' }} onClick={() => onNavigate && onNavigate('医生排班')}>
            查看完整排班表
          </button>
        </div>
      </div>
    </div>
  );
}
