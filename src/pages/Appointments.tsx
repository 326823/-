import React, { useState, useEffect } from 'react';
import { Appointment } from '../types';

const API_URL = 'https://houduan-hlb1.onrender.com/appointments';
const DOCTORS_URL = 'https://houduan-hlb1.onrender.com/doctors';

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<{ id: number, name: string, department: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Appointment>>({ pet: '', owner: '', doctor: '', reason: '', isUrgent: false });

  const fetchAllData = async () => {
    try {
      const [aptRes, docRes] = await Promise.all([
        fetch(API_URL),
        fetch(DOCTORS_URL)
      ]);
      if (aptRes.ok) setAppointments(await aptRes.json());
      if (docRes.ok) {
        const docs = await docRes.json();
        setDoctors(docs);
      }
    } catch (err) {
      console.error("轮询同步失败:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
    const timer = setInterval(fetchAllData, 5000); 
    return () => clearInterval(timer);
  }, []);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setAppointments(appointments.map(a => a.id === id ? updated : a));
      }
    } catch (err) {
      alert("状态变更失败，请检查网络！");
    }
  };

  const deleteAppointment = async (id: number, pet: string) => {
    if (window.confirm(`⚠️ 确认要归档并移除【${pet}】的就诊记录吗？`)) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        setAppointments(appointments.filter(a => a.id !== id));
      } catch (err) {
        alert("归档失败！");
      }
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        pet: formData.pet || '未知宠物',
        owner: formData.owner || '佚名',
        doctor: formData.doctor || (doctors[0] ? doctors[0].name : '初诊医生'),
        reason: formData.reason || '常规检查',
        isUrgent: !!formData.isUrgent,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        status: 'TODO'
      };
      
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const created = await res.json();
        setAppointments([...appointments, created]);
        setIsModalOpen(false);
        setFormData({ pet: '', owner: '', doctor: doctors[0] ? doctors[0].name : '', reason: '', isUrgent: false });
      }
    } catch (err) {
      alert("预约开单失败，请检查网络！");
    }
  };

  return (
    <>
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="table-toolbar" style={{ marginBottom: '24px' }}>
          <div>
            <h2 className="page-title">分诊叫号 Kanban 视图</h2>
            <p style={{ color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('zh-CN')} - 全院实时候诊与接诊进程控制台</p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>🗓️ 预约挂新号</button>
        </div>

        <div className="kanban-board">
          {/* Waiting */}
          <div className="board-col">
            <h3>等候中 <span>{appointments.filter(a => a.status === 'TODO').length}</span></h3>
            {isLoading && <p style={{ fontSize: '0.8.5rem', color: '#888' }}>数据同步中...</p>}
            {appointments.filter(a => a.status === 'TODO').map(apt => (
              <div key={apt.id} className={`apt-card ${apt.isUrgent ? 'urgent' : ''}`}>
                <div className="apt-header">
                  <span>{apt.pet} ({apt.owner}) {apt.isUrgent && <span style={{ color: 'var(--danger)', fontSize:'0.8rem' }}>🔥 [急诊]</span>}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{apt.time} 取号</span>
                </div>
                <div className="apt-body">
                  <span>接诊医生: <strong style={{color:'var(--text-main)'}}>{apt.doctor}</strong></span>
                  <span style={{ margin: '0 8px', color: '#CBD5E1' }}>|</span>
                  <span style={{ color: 'var(--text-muted)' }}>{apt.reason}</span>
                </div>
                <div className="apt-footer">
                  <span className="badge" style={{ background: '#EEF2FF', color: '#4F46E5'}}>大厅候诊区</span>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', background: 'var(--primary)', color: 'white', border: 'none' }} onClick={() => handleStatusChange(apt.id, 'DOING')}>
                    📣 呼叫接诊
                  </button>
                </div>
              </div>
            ))}
            {!isLoading && appointments.filter(a => a.status === 'TODO').length === 0 && (
              <p style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>暂无候诊宠物</p>
            )}
          </div>

          {/* Doing */}
          <div className="board-col">
            <h3>正在接诊中 <span>{appointments.filter(a => a.status === 'DOING').length}</span></h3>
            {appointments.filter(a => a.status === 'DOING').map(apt => (
              <div key={apt.id} className={`apt-card ${apt.isUrgent ? 'urgent' : ''}`} style={{ borderLeft: '4px solid var(--primary)' }}>
                <div className="apt-header">
                  <span>{apt.pet} {apt.isUrgent && <span style={{ color: 'var(--danger)', fontSize:'0.8rem' }}>🔥</span>}</span>
                  <span style={{ color: 'var(--primary)' }}>诊室就位</span>
                </div>
                <div className="apt-body">
                  <span>👨‍⚕️ 主治医生: <strong style={{color:'var(--text-main)'}}>{apt.doctor}</strong></span>
                </div>
                <div className="apt-footer">
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>病因: {apt.reason}</span>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'var(--primary)', color: 'var(--primary)' }} onClick={() => handleStatusChange(apt.id, 'DONE')}>
                    ✅ 完成开嘱
                  </button>
                </div>
              </div>
            ))}
            {!isLoading && appointments.filter(a => a.status === 'DOING').length === 0 && (
              <p style={{ textAlign: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>所有诊室空闲</p>
            )}
          </div>

          {/* Done */}
          <div className="board-col">
            <h3>已完成诊疗 <span>{appointments.filter(a => a.status === 'DONE').length}</span></h3>
            {appointments.filter(a => a.status === 'DONE').map(apt => (
              <div key={apt.id} className="apt-card done" style={{ opacity: 0.8 }}>
                <div className="apt-header">
                  <span style={{ textDecoration: 'line-through' }}>{apt.pet} ({apt.owner})</span>
                  <span>🟢 已缴费</span>
                </div>
                <div className="apt-body">
                  <span style={{ color: 'var(--text-muted)' }}>医生: {apt.doctor} | 已指引至取药窗口</span>
                </div>
                <div className="apt-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>诊毕于 {apt.time}</span>
                  <button className="btn-icon danger" style={{ fontSize: '0.85rem' }} title="归档记录" onClick={() => deleteAppointment(apt.id, apt.pet)}>
                    🗑️ 移除
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>🗓️ 宠物分诊挂号申请</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreate}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="input-group">
                    <label>就诊宠物名</label>
                    <input autoFocus value={formData.pet} onChange={e => setFormData({...formData, pet: e.target.value})} type="text" placeholder="例如：奥利奥" required />
                  </div>
                  <div className="input-group">
                    <label>所属主人</label>
                    <input value={formData.owner} onChange={e => setFormData({...formData, owner: e.target.value})} type="text" placeholder="例如：张女士" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group" style={{ flex: 2 }}>
                    <label>指派接诊医生</label>
                    <select value={formData.doctor} onChange={e => setFormData({...formData, doctor: e.target.value})} required>
                      {doctors.map(doc => (
                        <option key={doc.id} value={doc.name}>👨‍⚕️ {doc.name} ({doc.department})</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <label>是否急诊通道</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '10px' }}>
                      <input 
                        type="checkbox" 
                        checked={formData.isUrgent} 
                        onChange={e => setFormData({...formData, isUrgent: e.target.checked})} 
                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                      />
                      <span style={{ color: formData.isUrgent ? 'var(--danger)' : 'var(--text-main)', fontWeight: formData.isUrgent ? 600 : 'normal' }}>
                        🔥 红标急诊
                      </span>
                    </label>
                  </div>
                </div>

                <div className="input-group">
                  <label>描述大致病因或需求</label>
                  <input value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})} type="text" placeholder="例如：发烧呕吐/或者常规洗澡体检" required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>取消排号</button>
                <button type="submit" className="btn-primary">📝 生成叫号单</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
