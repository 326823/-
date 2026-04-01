import React, { useState, useMemo, useEffect } from 'react';
import { PetRecord } from '../types';

interface PetRecordsProps {
  searchQuery: string;
}

export interface PetRecordsRef {
  openModal: () => void;
}

const API_URL = 'http://localhost:5000/records';

const PetRecords = React.forwardRef<PetRecordsRef, PetRecordsProps>(({ searchQuery }, ref) => {
  const [records, setRecords] = useState<PetRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PetRecord | null>(null);
  const [formData, setFormData] = useState<Partial<PetRecord>>({ petName: '', ownerName: '', type: '🐶 犬类', status: '治疗中', phone: '' });

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(API_URL);
      if (!res.ok) throw new Error('网络请求失败');
      const data = await res.json();
      // Reverse array to show newly added items first (if auto-incrementing ID)
      setRecords(Array.isArray(data) ? data.reverse() : []);
    } catch (error) {
      console.error("加载数据失败:", error);
      alert("⚠️ 无法连接到本地 json-server，请确保您已开启 npm run mock！");
    } finally {
      setIsLoading(false);
    }
  };

  React.useImperativeHandle(ref, () => ({
    openModal: () => openModal()
  }));

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r => 
      r.petName.toLowerCase().includes(q) || 
      r.ownerName.toLowerCase().includes(q) ||
      (r.phone && r.phone.includes(q))
    );
  }, [records, searchQuery]);

  const openModal = (record?: PetRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({ ...record });
    } else {
      setEditingRecord(null);
      setFormData({ petName: '', ownerName: '', type: '🐶 犬类', status: '治疗中', phone: '' });
    }
    setIsModalOpen(true);
  };

  const deleteRecord = async (id: number) => {
    if (window.confirm('⚠️ 确定要删除该条宠物档案吗？此操作不可逆。')) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        setRecords(records.filter(r => r.id !== id));
      } catch (error) {
        alert("删除记录失败，请检查网络！");
      }
    }
  };

  const saveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingRecord) {
        // Update via PUT request
        const res = await fetch(`${API_URL}/${editingRecord.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingRecord, ...formData })
        });
        const updated = await res.json();
        setRecords(records.map(r => r.id === editingRecord.id ? updated : r));
      } else {
        // Create via POST request (API automatically assigns next unique id)
        const newRecordPayload = {
          petName: formData.petName || '未知',
          ownerName: formData.ownerName || '佚名',
          phone: formData.phone || '暂无电话',
          type: formData.type || '🐶 犬类',
          status: formData.status || '治疗中',
          lastVisit: new Date().toISOString().slice(0, 16).replace('T', ' ')
        };
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newRecordPayload)
        });
        const created = await res.json();
        setRecords([created, ...records]);
      }
      setIsModalOpen(false);
    } catch (error) {
      alert("保存失败，请检查网络连接或接口地址配置！");
    }
  };

  return (
    <>
      <div className="card animate-slide-up" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="table-toolbar">
          <div>
            <h3>全部宠物档案 ({records.length})</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>管理医院内部所有注册的宠物健康及归属人信息。</p>
          </div>
          <div className="filter-group">
            <button className="btn-secondary" onClick={fetchRecords} disabled={isLoading}>
              {isLoading ? '加载中...' : '🔄 刷新数据'}
            </button>
            <button className="btn-primary" onClick={() => openModal()}>➕ 新增档案</button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-grid">
            <thead>
              <tr>
                <th>宠物与主人信息</th>
                <th>联系电话</th>
                <th>种类</th>
                <th>当前治疗状态</th>
                <th>最后就诊时间</th>
                <th style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && records.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>加载宠物档案数据中...</td>
                </tr>
              )}
              {filteredRecords.map(record => (
                <tr key={record.id}>
                  <td>
                    <div className="pet-cell">
                      <div className="pet-avatar">{String(record.type || '').split(' ')[0]}</div>
                      <div className="pet-info">
                        <p className="pet-name">{record.petName}</p>
                        <p className="owner-name">主人: {record.ownerName}</p>
                      </div>
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>{record.phone || '-'}</td>
                  <td><span className="badge" style={{ background: 'var(--divider)', color: 'var(--text-main)'}}>{record.type}</span></td>
                  <td>
                    <span className={`status-tag ${record.status === '已康复' ? 'inactive' : record.status === '治疗中' ? 'active' : 'warning'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{record.lastVisit}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-icon" onClick={() => openModal(record)} title="编辑">✏️</button>
                    <button className="btn-icon danger" onClick={() => deleteRecord(record.id)} title="删除" style={{ marginLeft: '8px' }}>🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {!isLoading && filteredRecords.length === 0 && (
            <div className="empty-state" style={{ padding: '40px', border: 'none' }}>
              <span>🔍</span>
              <p>没有找到相关宠物档案，或后端 API 未启动。</p>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Modal for CRUD */}
      {isModalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingRecord ? '📝 编辑宠物病历档案' : '🐾 新增宠物病历档案'}</h2>
              <button className="close-btn" type="button" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveRecord}>
              <div className="modal-body">
                <div className="form-row">
                  <div className="input-group">
                    <label>宠物昵称</label>
                    <input autoFocus value={formData.petName} onChange={e => setFormData({...formData, petName: e.target.value})} type="text" placeholder="例如：奥利奥" required />
                  </div>
                  <div className="input-group">
                    <label>宠物种类</label>
                    <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                      <option>🐶 犬类</option>
                      <option>🐱 猫咪</option>
                      <option>🦎 异宠</option>
                      <option>🕊️ 鸟类</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>主人姓名</label>
                    <input value={formData.ownerName} onChange={e => setFormData({...formData, ownerName: e.target.value})} type="text" placeholder="例如：张先生" required />
                  </div>
                  <div className="input-group">
                    <label>联系电话</label>
                    <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" placeholder="138-xxxx-xxxx" />
                  </div>
                </div>
                <div className="input-group">
                  <label>医疗状态标识</label>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                    <option value="治疗中">🔴 治疗中 (需持续跟进)</option>
                    <option value="观察中">🟡 观察中 (轻度症状)</option>
                    <option value="已康复">🟢 已康复 (可出院/结单)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>取消返回</button>
                <button type="submit" className="btn-primary">💾 保存档案信息</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
});

export default PetRecords;
