import React, { useState, useEffect, useMemo } from 'react';
import { Doctor } from '../types';

const API_URL = 'https://houduan-hlb1.onrender.com/doctors';

export default function DoctorSchedule() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('全部科室');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState<Partial<Doctor>>({ name: '', department: '内科', title: '医师', avatar: '👨‍⚕️', rating: 5.0, status: '出诊中', experience: '1年', fee: 50 });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      if (res.ok) setDoctors(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '出诊中': return 'var(--primary)';
      case '手术中': return 'var(--danger)';
      case '急救中': return '#DC2626';
      case '学术会': return 'var(--warning)';
      case '休息': return 'var(--text-muted)';
      default: return 'var(--secondary)';
    }
  };
  
  const handleStatusChange = async (docId: number, newStatus: string) => {
    const doc = doctors.find(d => d.id === docId);
    if (!doc) return;
    try {
      const res = await fetch(`${API_URL}/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setDoctors(doctors.map(d => d.id === docId ? updated : d));
      }
    } catch (err) {
      alert('状态更新失败！请检查网络设置。');
    }
  };

  const openModal = (doc?: Doctor) => {
    if (doc) {
      setEditingDoc(doc);
      setFormData({ ...doc });
    } else {
      setEditingDoc(null);
      setFormData({ name: '', department: '内科', title: '医师', avatar: '👨‍⚕️', rating: 5.0, status: '出诊中', experience: '1年', fee: 50 });
    }
    setIsModalOpen(true);
  };

  const deleteDoc = async (id: number, name: string) => {
    if (window.confirm(`⚠️ 确定要将【${name}】医生从系统排班中彻底移除吗？此操作不可逆。`)) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        setDoctors(doctors.filter(d => d.id !== id));
      } catch (err) {
        alert("删除记录失败，请检查网络！");
      }
    }
  };

  const saveDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingDoc) {
        // Update via PUT request
        const res = await fetch(`${API_URL}/${editingDoc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingDoc, ...formData })
        });
        const updated = await res.json();
        setDoctors(doctors.map(d => d.id === editingDoc.id ? updated : d));
      } else {
        // Create via POST request
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        const created = await res.json();
        setDoctors([created, ...doctors]);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("保存失败，请检查连接！");
    }
  };


  const departments = useMemo(() => {
    const depts = new Set(doctors.map(d => d.department));
    return ['全部科室', ...Array.from(depts)];
  }, [doctors]);

  const displayedDoctors = useMemo(() => {
    if (filterDept === '全部科室') return doctors;
    return doctors.filter(d => d.department === filterDept);
  }, [doctors, filterDept]);

  return (
    <>
      <div className="animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        <div className="table-toolbar" style={{ alignItems: 'flex-start' }}>
          <div>
            <h2 className="page-title">医生排班与档案中心</h2>
            <p style={{ color: 'var(--text-muted)' }}>全局监控全院精英医疗骨干的实时会诊与休假统筹</p>
          </div>
          
          <div className="filter-group" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ position: 'relative' }}>
              <select 
                className="btn-secondary" 
                style={{ appearance: 'none', paddingRight: '36px', minWidth: '140px', cursor: 'pointer', background: 'var(--bg-app)', border: '1px solid var(--border)' }}
                value={filterDept} 
                onChange={(e) => setFilterDept(e.target.value)}
              >
                {departments.map(dept => (
                  <option key={dept} value={dept}>🏥 {dept}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', opacity: 0.5 }}>▼</span>
            </div>
            <button className="btn-secondary" onClick={fetchDoctors} disabled={isLoading}>🔄 刷新状态</button>
            <button className="btn-primary" onClick={() => openModal()}>👨‍⚕️ 录入新医生</button>
          </div>
        </div>

        {isLoading ? (
          <p style={{ padding: '20px 0' }}>排班档案与医生数据读取中...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '24px' }}>
            {displayedDoctors.map(doc => (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div style={{ 
                    width: '64px', height: '64px', borderRadius: '16px',  flexShrink: 0,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem' 
                  }}>
                    {doc.avatar}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <h3 style={{ fontSize: '1.15rem' }}>{doc.name}</h3>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--warning)', background: '#FFFBEB', padding: '2px 8px', borderRadius: '12px' }}>⭐ {doc.rating}</span>
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '8px' }}>
                      <span style={{fontWeight: 600, color: 'var(--text-main)'}}>{doc.department}</span> | {doc.title} | 执业{doc.experience}
                    </p>
                    <p style={{ color: 'var(--primary)', fontSize: '0.85rem', marginBottom: '12px', fontWeight: 600 }}>
                      挂号费: ¥{doc.fee || 50}
                    </p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select 
                        style={{
                          fontSize: '0.8rem', fontWeight: 600, padding: '4px 10px', borderRadius: '20px',
                          border: `1px solid ${getStatusColor(doc.status)}`,
                          color: getStatusColor(doc.status),
                          background: doc.status === '休息' ? '#F1F5F9' : '#fff',
                          outline: 'none', cursor: 'pointer', transition: 'all 0.2s',
                          appearance: 'none',
                        }}
                        value={doc.status}
                        onChange={(e) => handleStatusChange(doc.id, e.target.value)}
                        title="点击快速修改当前状态"
                      >
                        <option value="出诊中">🟢 出诊中</option>
                        <option value="手术中">🔴 手术中</option>
                        <option value="急救中">🚨 急救中</option>
                        <option value="学术会">🟡 学术会</option>
                        <option value="休息">⚫ 休息</option>
                      </select>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--divider)', paddingTop: '12px' }}>
                  <button className="btn-secondary" style={{ fontSize: '0.8rem', padding: '4px 12px' }} onClick={() => openModal(doc)}>✏️ 编辑资料</button>
                  <button className="btn-icon danger" style={{ fontSize: '0.9rem' }} onClick={() => deleteDoc(doc.id, doc.name)} title="删除医生">🗑️</button>
                </div>
              </div>
            ))}
            
            {displayedDoctors.length === 0 && (
               <div className="empty-state" style={{ gridColumn: '1 / -1', minHeight: '150px' }}>
                 <span style={{fontSize: '2rem', opacity: 0.3}}>🏢</span>
                 <p style={{marginTop: '10px'}}>该科室暂无可供调遣的医生档案记录。</p>
               </div>
            )}
          </div>
        )}

      </div>

      {isModalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingDoc ? '📝 编辑医生档案' : '👨‍⚕️ 录入新执业医生'}</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveDoc}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="input-group">
                    <label>医生姓名</label>
                    <input autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="例如：李时珍" required />
                  </div>
                  <div className="input-group">
                    <label>系统头像 (Emoji)</label>
                    <select value={formData.avatar} onChange={e => setFormData({...formData, avatar: e.target.value})}>
                      <option>👨‍⚕️</option>
                      <option>👩‍⚕️</option>
                      <option>🧑‍⚕️</option>
                      <option>🩺</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>挂靠科室</label>
                    <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                      <option>内科</option>
                      <option>外科</option>
                      <option>异宠专科</option>
                      <option>皮肤科</option>
                      <option>牙科</option>
                      <option>眼科</option>
                      <option>急诊科</option>
                      <option>住院部</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>职称</label>
                    <select value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}>
                      <option>见习医师</option>
                      <option>医师</option>
                      <option>主治医师</option>
                      <option>副主任医师</option>
                      <option>主任医师</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="input-group">
                    <label>执业年限</label>
                    <input value={formData.experience} onChange={e => setFormData({...formData, experience: e.target.value})} type="text" placeholder="例如：12年" required />
                  </div>
                  <div className="input-group">
                    <label>初始评分 (最高 5.0)</label>
                    <input value={formData.rating} onChange={e => setFormData({...formData, rating: Number(e.target.value)})} type="number" min="0" max="5.0" step="0.1" required />
                  </div>
                </div>
                
                <div className="form-row">
                  <div className="input-group">
                    <label>挂号费设置 (¥)</label>
                    <input value={formData.fee} onChange={e => setFormData({...formData, fee: Number(e.target.value)})} type="number" min="0" step="0.01" required />
                  </div>
                  <div className="input-group">
                    <label>指派今日初始状态</label>
                    <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="出诊中">🟢 出诊中 (就位前台候场)</option>
                      <option value="手术中">🔴 手术中 (免打扰模式)</option>
                      <option value="急救中">🚨 急救中</option>
                      <option value="学术会">🟡 学术会</option>
                      <option value="休息">⚫ 休假或轮空</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>取消返回</button>
                <button type="submit" className="btn-primary">💾 确认归档保存</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
