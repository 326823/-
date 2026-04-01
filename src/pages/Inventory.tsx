import React, { useState, useEffect } from 'react';
import { Medicine } from '../types';

const API_URL = 'http://localhost:5000/medicines';

export default function Inventory() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<Medicine | null>(null);
  const [formData, setFormData] = useState<Partial<Medicine>>({ name: '', category: '抗生素', stock: 0, unit: '盒', price: 0, status: '充足' });

  const [selectedMedForUsage, setSelectedMedForUsage] = useState<Medicine | null>(null);
  const [usageLogs, setUsageLogs] = useState<any[]>([]);

  useEffect(() => {
    fetchMedicines();
  }, []);

  const fetchMedicines = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(API_URL);
      if (res.ok) setMedicines(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsageDetails = async (med: Medicine) => {
    setSelectedMedForUsage(med);
    try {
       const res = await fetch('http://localhost:5000/medical_records');
       const records = await res.json();
       // Filter records where this med was prescribed
       const filtered = records.filter((r: any) => 
          r.prescriptions?.some((p: any) => p.med.id === med.id)
       ).map((r: any) => ({
           petName: r.petName,
           ownerName: r.ownerName,
           date: r.createdAt.split('T')[0],
           amount: r.prescriptions.find((p: any) => p.med.id === med.id)?.amount
       }));
       setUsageLogs(filtered);
    } catch (err) {
       console.error("Fetch usage failed", err);
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === '缺货告警') return 'danger';
    if (status === '紧缺') return 'warning';
    return 'active';
  };

  const openModal = (med?: Medicine) => {
    if (med) {
      setEditingMed(med);
      setFormData({ ...med });
    } else {
      setEditingMed(null);
      setFormData({ name: '', category: '抗生素', stock: 0, unit: '盒', price: 0, status: '充足' });
    }
    setIsModalOpen(true);
  };

  const deleteMed = async (id: number) => {
    if (window.confirm('⚠️ 确定要下架并删除此药品记录吗？')) {
      try {
        await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        setMedicines(medicines.filter(m => m.id !== id));
      } catch (err) {
        alert("删除失败，请检查网络！");
      }
    }
  };

  const saveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentStock = Number(formData.stock) || 0;
      let currentStatus = formData.status;
      if (currentStock < 10) currentStatus = '缺货告警';
      else if (currentStock < 30) currentStatus = '紧缺';
      else currentStatus = '充足';

      const payload = { ...formData, stock: currentStock, price: Number(formData.price) || 0, status: currentStatus };

      if (editingMed) {
        const res = await fetch(`${API_URL}/${editingMed.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingMed, ...payload })
        });
        const updated = await res.json();
        setMedicines(medicines.map(m => m.id === editingMed.id ? updated : m));
      } else {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const created = await res.json();
        setMedicines([...medicines, created]);
      }
      setIsModalOpen(false);
    } catch (err) {
      alert("保存失败，请检查网络连接！");
    }
  };

  const quickRestock = async (med: Medicine) => {
    const input = window.prompt(`📦 请输入向【${med.name}】追加的入库数量：`, "50");
    if (input && !isNaN(Number(input))) {
      const added = Number(input);
      const newStock = med.stock + added;
      let newStatus = med.status;
      if (newStock < 10) newStatus = '缺货告警';
      else if (newStock < 30) newStatus = '紧缺';
      else newStatus = '充足';

      try {
        const res = await fetch(`${API_URL}/${med.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: newStock, status: newStatus })
        });
        const updated = await res.json();
        setMedicines(medicines.map(m => m.id === med.id ? updated : m));
      } catch (err) {
        alert("快捷入库失败！");
      }
    }
  };

  return (
    <>
      <div className="card animate-slide-up" style={{ minHeight: '600px' }}>
        <div className="table-toolbar">
          <div>
            <h2 className="page-title">智能库存监测中心</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>同步 EMR 处方系统，实现药品消耗实时追溯与供应预警</p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className="btn-secondary" onClick={fetchMedicines} disabled={isLoading}>🔄 刷新库存</button>
            <button className="btn-primary" onClick={() => openModal()}>➕ 新增药品目录</button>
          </div>
        </div>

        {isLoading ? <p style={{ padding: '20px' }}>库存数据拉取中...</p> : (
          <table className="data-grid" style={{ marginTop: '24px' }}>
            <thead>
              <tr>
                <th>药品名称</th>
                <th>分类</th>
                <th>当前库存</th>
                <th>建议零售价</th>
                <th>状态评估</th>
                <th style={{ textAlign: 'right' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map(med => (
                <tr key={med.id}>
                  <td style={{ fontWeight: 600 }}>{med.name}</td>
                  <td><span className="badge" style={{ background: 'var(--divider)', color: 'var(--text-main)' }}>{med.category}</span></td>
                  <td>
                    <span style={{ fontSize: '1.2rem', fontWeight: 700, color: med.stock < 20 ? 'var(--danger)' : 'var(--text-main)' }}>
                      {med.stock}
                    </span> {med.unit}
                  </td>
                  <td style={{ color: 'var(--text-muted)' }}>¥ {med.price.toFixed(2)}</td>
                  <td>
                    <span className={`status-tag ${getStatusBadge(med.status)}`}>{med.status}</span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn-secondary" onClick={() => fetchUsageDetails(med)} style={{ padding: '4px 12px', fontSize: '0.8rem', marginRight: '8px', border: '1px solid var(--primary)', color: 'var(--primary)' }}>🔍 使用详情</button>
                    <button className="btn-secondary" onClick={() => quickRestock(med)} style={{ padding: '4px 12px', fontSize: '0.8rem', marginRight: '8px' }}>+ 快捷入库</button>
                    <button className="btn-icon" onClick={() => openModal(med)} title="编辑信息">📝</button>
                    <button className="btn-icon danger" onClick={() => deleteMed(med.id)} title="下架删除" style={{ marginLeft: '4px' }}>🗑️</button>
                  </td>
                </tr>
              ))}
              {medicines.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>暂无药品数据，请新增。</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Usage Details Sidebar/Modal */}
      {selectedMedForUsage && (
          <div className="overlay" style={{ justifyContent: 'flex-end', alignItems: 'stretch', padding: '0' }} onClick={e => e.target === e.currentTarget && setSelectedMedForUsage(null)}>
              <div className="modal animate-slide-right" style={{ width: '450px', height: '100vh', borderRadius: '0', margin: '0', padding: '40px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>📦 药品流通溯源详情</h2>
                    <button onClick={() => setSelectedMedForUsage(null)} style={{ background: 'none', border: 'none', fontSize: '2rem', cursor: 'pointer' }}>×</button>
                 </div>
                 
                 <div style={{ padding: '20px', background: 'var(--bg-app)', borderRadius: '16px', marginBottom: '32px' }}>
                    <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>当前查询药品：</p>
                    <h3 style={{ margin: 0, color: 'var(--primary)', fontSize: '1.2rem' }}>{selectedMedForUsage.name}</h3>
                    <p style={{ margin: '8px 0 0 0', fontWeight: 800 }}>当前剩余库存: {selectedMedForUsage.stock} {selectedMedForUsage.unit}</p>
                 </div>

                 <h4 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
                    📋 临床领用明细 
                    <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>共 {usageLogs.length} 条记录</span>
                 </h4>

                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: 'calc(100vh - 350px)', overflowY: 'auto', paddingRight: '4px' }}>
                    {usageLogs.map((log, idx) => (
                        <div key={idx} style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '14px', position: 'relative' }}>
                           <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <strong style={{ fontSize: '1rem' }}>{log.petName}</strong>
                              <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 900 }}>-{log.amount} {selectedMedForUsage.unit}</span>
                           </div>
                           <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>主人: {log.ownerName}</span>
                              <span>{log.date}</span>
                           </div>
                        </div>
                    ))}
                    {usageLogs.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>暂无临床领用排期记录</div>
                    )}
                 </div>
                 
                 <div style={{ marginTop: '40px', borderTop: '1px solid var(--border)', paddingTop: '20px' }}>
                    <button onClick={() => setSelectedMedForUsage(null)} style={{ width: '100%', padding: '12px', background: 'var(--divider)', border: 'none', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>关闭详情预览</button>
                 </div>
              </div>
          </div>
      )}

      {isModalOpen && (
        <div className="overlay" onClick={(e) => { if (e.target === e.currentTarget) setIsModalOpen(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editingMed ? '📝 编辑药品信息' : '➕ 上传新药品目录'}</h2>
              <button type="button" className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={saveMed}>
              <div className="modal-body">
                <div className="input-group">
                  <label>药品名称及品牌</label>
                  <input autoFocus value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="例如：拜宠清 (Drontal Plus)" required />
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>医疗分类</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      <option>抗生素</option>
                      <option>驱虫药</option>
                      <option>疫苗</option>
                      <option>消炎药</option>
                      <option>洗耳液</option>
                      <option>抗过敏</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>计费单位</label>
                    <select value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                      <option>盒</option>
                      <option>瓶</option>
                      <option>支</option>
                      <option>片</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="input-group">
                    <label>初始库存 (系统将自动匹配紧缺状态)</label>
                    <input value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} type="number" min="0" required />
                  </div>
                  <div className="input-group">
                    <label>终端零售单价 (¥)</label>
                    <input value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} type="number" min="0" step="0.1" required />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>取消</button>
                <button type="submit" className="btn-primary">💾 保存至药房库</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
