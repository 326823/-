import React, { useState, useEffect } from 'react';
import { PetRecord, Medicine } from '../types';

const API_RECORDS = 'http://localhost:5000/records';
const API_MEDS = 'http://localhost:5000/medicines';

export default function SOAPRecords() {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);

  // Form State Per Patient
  const [currentEmr, setCurrentEmr] = useState({
    subjective: '', objective: '', assessment: '', plan: '', prescriptions: [] as any[], weight: 5.0, conflictWarning: null as string | null
  });
  const [selectedMedId, setSelectedMedId] = useState<string>('');
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [visitStatus, setVisitStatus] = useState<Record<number, string>>({});

  useEffect(() => {
    fetch(API_RECORDS).then(res => res.json()).then(data => {
      setPets(data);
      if (data.length > 0) setSelectedPet(data[0]);
    });
    fetch(API_MEDS).then(res => res.json()).then(setMedicines);
  }, []);

  useEffect(() => {
    if (selectedPet) {
      // Fetch visit status for selected pet
      fetch(`http://localhost:5000/medical_records?petId=${selectedPet.id}`)
        .then(res => res.json())
        .then(data => {
          setVisitStatus(prev => ({ ...prev, [selectedPet.id]: data.length > 0 ? '复诊' : '初诊' }));
        });
        
      // Also firmly reset the form for the new pet!
      setCurrentEmr({
        subjective: '', objective: '', assessment: '', plan: '', prescriptions: [], weight: 5.0, conflictWarning: null
      });
      setSelectedMedId('');
    }
  }, [selectedPet]);

  const updateEmr = (updates: any) => {
    setCurrentEmr(prev => ({ ...prev, ...updates }));
  };

  const handleSelectMed = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const medId = Number(e.target.value);
    if (!medId) return;
    setSelectedMedId(''); // Force select back to hint option

    const med = medicines.find(m => m.id === medId);
    if (!med || !selectedPet) return;

    setCurrentEmr(prevEmr => {
      const existingRxs = prevEmr.prescriptions || [];
      const hasAntibiotic = existingRxs.some((p: any) => p.med.category === '抗生素' || p.med.category === '消炎药');
      const isAddingAntibiotic = med.category === '抗生素' || med.category === '消炎药';

      let warning = prevEmr.conflictWarning;
      if (hasAntibiotic && isAddingAntibiotic) {
        warning = `🚨 医疗配伍警告：【${med.name}】与已开具的同类抗生素存在重复用药风险！`;
        return { ...prevEmr, conflictWarning: warning };
      }

      let baseAmount = med.category === '疫苗' ? 1 : Number((prevEmr.weight * 1.5).toFixed(1));
      if (isNaN(baseAmount) || baseAmount <= 0) baseAmount = 1;

      return {
        ...prevEmr,
        conflictWarning: null,
        prescriptions: [...existingRxs, { id: Date.now() + Math.random(), med, amount: baseAmount }]
      };
    });
  };

  const removePrescription = (id: number) => {
    setCurrentEmr(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.filter((p: any) => p.id !== id),
      conflictWarning: null
    }));
  };

  const handleAmountChange = (id: number, newAmount: number) => {
    // We let newAmount be processed smoothly, fallback perfectly
    const validAmount = isNaN(newAmount) || newAmount < 0 ? 0 : newAmount;
    setCurrentEmr(prev => ({
      ...prev,
      prescriptions: prev.prescriptions.map((p: any) => p.id === id ? { ...p, amount: validAmount } : p)
    }));
  };

  const loadHistory = async () => {
    if (!selectedPet) return;
    try {
      const res = await fetch(`http://localhost:5000/medical_records?petId=${selectedPet.id}&_sort=createdAt&_order=asc`);
      const data = await res.json();
      // Add local visit number for display (1, 2, 3...)
      const mappedData = data.map((item: any, index: number) => ({
        ...item,
        localId: index + 1
      })).reverse();
      setHistoryRecords(mappedData);
      setIsHistoryOpen(true);
    } catch {
      alert("加载病历历史失败");
    }
  };

  const deleteRecord = async (recordId: string | number) => {
    if (!window.confirm("确定要永久删除这条病历记录吗？此操作无法撤销。")) return;
    try {
      await fetch(`http://localhost:5000/medical_records/${recordId}`, { method: 'DELETE' });
      // Refresh list
      const res = await fetch(`http://localhost:5000/medical_records?petId=${selectedPet?.id}&_sort=createdAt&_order=asc`);
      const data = await res.json();
      const mappedData = data.map((item: any, index: number) => ({
        ...item,
        localId: index + 1
      })).reverse();
      setHistoryRecords(mappedData);
      
      // Update visit status tag if no records left
      if (selectedPet) {
        setVisitStatus(prev => ({ ...prev, [selectedPet.id]: data.length > 0 ? '复诊' : '初诊' }));
      }
    } catch {
      alert("删除失败，请稍后重试");
    }
  };

  const saveEMR = async () => {
    if (!selectedPet) return;
    setIsSaveModalOpen(false);

    // Calculate current visit number for this pet
    const historyRes = await fetch(`http://localhost:5000/medical_records?petId=${selectedPet.id}`);
    const existingCount = (await historyRes.json()).length;

    const pureEmr = { ...currentEmr } as any;
    delete pureEmr.id;

    const recordNode = {
      petId: selectedPet.id,
      petName: selectedPet.petName,
      ownerName: selectedPet.ownerName,
      visitNo: existingCount + 1,
      createdAt: new Date().toISOString(),
      ...pureEmr
    };

    try {
      const recordRes = await fetch('http://localhost:5000/medical_records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(recordNode)
      });

      if (!recordRes.ok) throw new Error("病历写入失败");

      const updatePromises = currentEmr.prescriptions.map(async (p: any) => {
        const currentMed = medicines.find(m => m.id === p.med.id);
        if (!currentMed) return;
        const newStock = Math.max(0, currentMed.stock - p.amount);
        const newStatus = newStock === 0 ? "断货" : newStock < 10 ? "预警" : "充足";
        return fetch(`http://localhost:5000/medicines/${p.med.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stock: Number(newStock.toFixed(2)), status: newStatus })
        });
      });

      await Promise.all(updatePromises);
      setVisitStatus(prev => ({ ...prev, [selectedPet.id]: '复诊' }));
      fetch(API_MEDS).then(res => res.json()).then(setMedicines);
      setCurrentEmr({ subjective: '', objective: '', assessment: '', plan: '', prescriptions: [], weight: 5.0, conflictWarning: null });
    } catch (err) {
      alert("错误: " + (err instanceof Error ? err.message : "未知网络错误"));
    }
  };

  return (
    <div className="animate-slide-up" style={{ display: 'flex', gap: '24px', height: '100%' }}>
      
      {/* Left Panel: Patient List */}
      <div className="card" style={{ width: '300px', display: 'flex', flexDirection: 'column', padding: '16px' }}>
        <h3 style={{ marginBottom: '16px', fontSize: '1.1rem' }}>今日就诊清单</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', flex: 1 }}>
          {pets.slice(0, 10).map(pet => (
            <div 
              key={pet.id} 
              onClick={() => setSelectedPet(pet)}
              style={{
                padding: '12px', border: `1px solid ${selectedPet?.id === pet.id ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: '8px', cursor: 'pointer', background: selectedPet?.id === pet.id ? 'var(--primary-light)' : '#fff',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>{pet.petName}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{pet.type.split(' ')[0]}</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>主人: {pet.ownerName} | {pet.status}</p>
            </div>
          ))}
        </div>
      </div>
 
      {/* Right Panel: EMR / SOAP */}
      <div key={`emr-panel-${selectedPet?.id}`} className="card animate-slide-up" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {selectedPet ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '16px', marginBottom: '20px' }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ fontSize: '1.25rem', color: 'var(--primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {selectedPet.petName} 
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>({selectedPet.type})</span>
                  <span style={{ fontSize: '0.7rem', background: visitStatus[selectedPet.id] === '复诊' ? '#FEF3C7' : '#D1FAE5', color: visitStatus[selectedPet.id] === '复诊' ? '#D97706' : '#059669', padding: '2px 8px', borderRadius: '12px', fontWeight: 800 }}>
                    {visitStatus[selectedPet.id] || '检索中...'}
                  </span>
                </h2>
                <div style={{ display: 'flex', gap: '20px', fontSize: '0.9rem', color: '#64748B', alignItems: 'center', flexWrap: 'nowrap' }}>
                  <span>档案: PTK-{selectedPet.id}748</span>
                  <span>负责人: {selectedPet.ownerName}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: '#1E293B' }}>
                    当日患宠体重:
                    <input 
                      type="text" 
                      inputMode="decimal"
                      value={currentEmr.weight} 
                      onChange={e => updateEmr({ weight: parseFloat(e.target.value) || 0 })}
                      style={{ width: '60px', border: 'none', borderBottom: '2px solid #6366F1', background: 'transparent', textAlign: 'center', fontWeight: 900, color: '#6366F1', fontSize: '1.1rem', outline: 'none' }}
                    /> KG
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexShrink: 0 }}>
                <button className="btn-secondary" onClick={loadHistory} style={{ height: '40px', padding: '0 18px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '10px' }}>查询历史</button>
                <button className="btn-primary" onClick={() => setIsSaveModalOpen(true)} style={{ height: '40px', padding: '0 24px', fontSize: '0.9rem', fontWeight: 600, borderRadius: '10px' }}>签发保存</button>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '32px' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A', borderBottom: '2px solid #E2E8F0', paddingBottom: '12px' }}>
                   <span style={{ fontSize: '1.4rem' }}>📝</span> 标准 SOAP 临床记录
                </h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.95rem', color: '#334155' }}><strong style={{color:'#6366F1', fontSize: '1.05rem', marginRight: '6px'}}>S (Subjective) 主观叙述</strong> - 现病史/精神状态</label>
                  <textarea rows={3} value={currentEmr.subjective} onChange={e => updateEmr({ subjective: e.target.value })} placeholder="例如：连续呕吐两天，精神萎靡..." style={{ border: '1px solid #CBD5E1', background: '#F8FAFC', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', color: '#1E293B', outline: 'none', transition: 'all 0.2s', resize: 'vertical' }}></textarea>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.95rem', color: '#334155' }}><strong style={{color:'#10B981', fontSize: '1.05rem', marginRight: '6px'}}>O (Objective) 客观检查</strong> - 临床体检/TPR数据</label>
                  <textarea rows={3} value={currentEmr.objective} onChange={e => updateEmr({ objective: e.target.value })} placeholder="例如：T 39.5℃, P 120次/分..." style={{ border: '1px solid #CBD5E1', background: '#F8FAFC', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', color: '#1E293B', outline: 'none', transition: 'all 0.2s', resize: 'vertical' }}></textarea>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.95rem', color: '#334155' }}><strong style={{color:'#F59E0B', fontSize: '1.05rem', marginRight: '6px'}}>A (Assessment) 分析评估</strong> - 临床诊断</label>
                  <textarea rows={2} value={currentEmr.assessment} onChange={e => updateEmr({ assessment: e.target.value })} placeholder="腹部超声诊断意见..." style={{ border: '1px solid #CBD5E1', background: '#FFFBEB', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', color: '#1E293B', outline: 'none', transition: 'all 0.2s', resize: 'vertical' }}></textarea>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ fontSize: '0.95rem', color: '#334155' }}><strong style={{color:'#EF4444', fontSize: '1.05rem', marginRight: '6px'}}>P (Plan) 治疗计划</strong> - 医嘱/处方</label>
                  <textarea rows={2} value={currentEmr.plan} onChange={e => updateEmr({ plan: e.target.value })} placeholder="建议住院观护三天..." style={{ border: '1px solid #CBD5E1', background: '#FEF2F2', padding: '14px', borderRadius: '10px', fontSize: '0.95rem', color: '#1E293B', outline: 'none', transition: 'all 0.2s', resize: 'vertical' }}></textarea>
                </div>
              </div>

              {/* Prescription Section */}
              <div style={{ width: '420px', display: 'flex', flexDirection: 'column', gap: '16px', background: '#F8FAFC', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px', color: '#0F172A' }}>
                  <span style={{ fontSize: '1.4rem' }}>💊</span> 电子处方单
                </h3>
                
                <div style={{ background: 'linear-gradient(to right, #EEF2FF, #E0E7FF)', padding: '12px 16px', borderRadius: '10px', border: '1px solid #C7D2FE', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: '#4338CA', fontWeight: 600 }}>药量智能引擎已启动</span>
                  <span style={{ fontSize: '0.8rem', background: '#fff', color: '#4338CA', padding: '2px 12px', borderRadius: '12px', fontWeight: 900 }}>W: {currentEmr.weight}kg</span>
                </div>

                <div style={{ position: 'relative' }}>
                  <select 
                    className="btn-secondary" 
                    onChange={handleSelectMed} 
                    value={selectedMedId} 
                    style={{ width: '100%', height: '44px', padding: '0 16px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 600, appearance: 'none', background: '#fff', border: '2px solid #E2E8F0' }}
                  >
                    <option value="" disabled>➕ 检索并添加药品...</option>
                    {medicines.map(med => (
                      <option key={med.id} value={med.id}>{med.name} - ¥{med.price}/{med.unit}</option>
                    ))}
                  </select>
                </div>

                {currentEmr.conflictWarning && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', padding: '12px', borderRadius: '10px', color: '#DC2626', fontSize: '0.85rem', fontWeight: 600 }}>
                    🚨 {currentEmr.conflictWarning}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto' }}>
                  {currentEmr.prescriptions.map((p: any) => (
                    <div key={p.id} style={{ background: '#fff', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                        <div>
                           <p style={{ fontWeight: 800, color: '#1E293B', fontSize: '1rem' }}>{p.med.name}</p>
                           <p style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 600 }}>¥{p.med.price}/{p.med.unit}</p>
                        </div>
                        <button onClick={() => removePrescription(p.id)} style={{ color: '#EF4444', border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>🗑️</button>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F1F5F9', paddingTop: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="text" 
                            inputMode="decimal"
                            style={{ width: '80px', height: '36px', textAlign: 'center', border: '2px solid #E2E8F0', borderRadius: '10px', fontWeight: 900, color: '#6366F1', fontSize: '1rem', outline: 'none' }} 
                            value={p.amount} 
                            onChange={(e) => handleAmountChange(p.id, parseFloat(e.target.value) || 0)} 
                          />
                          <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#64748B' }}>{p.med.unit}</span>
                        </div>
                        <span style={{ fontWeight: 800, color: '#334155' }}>小计: ¥{(Number(p.amount) * Number(p.med.price || 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ borderTop: '2px dashed #CBD5E1', paddingTop: '16px', marginTop: 'auto' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '1rem', color: '#475569', fontWeight: 800 }}>合计处方金额</span>
                    <span style={{ color: '#EF4444', fontSize: '2rem', fontWeight: 950 }}>
                      <span style={{ fontSize: '1.2rem', marginRight: '4px' }}>¥</span> 
                      {currentEmr.prescriptions.reduce((sum: number, p: any) => sum + (Number(p.amount) * Number(p.med.price || 0)), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#94A3B8' }}>
            <span style={{ fontSize: '3rem' }}>🩺</span>
            <p>请点选左侧患宠</p>
          </div>
        )}
      </div>

      {isHistoryOpen && (
        <div className="overlay" style={{ zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) setIsHistoryOpen(false); }}>
          <div className="modal" style={{ maxWidth: '700px', width: '90%', maxHeight: '80vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '12px' }}>
            <div className="modal-header" style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>🗂️ 【{selectedPet?.petName}】 历史病历</h2>
               <button onClick={() => setIsHistoryOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '20px', background: '#F8FAFC' }}>
               {historyRecords.length === 0 ? <p style={{ textAlign: 'center', color: '#94A3B8' }}>暂无记录</p> : (
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                   {historyRecords.map(record => (
                      <div key={record.id} style={{ background: '#fff', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0', position: 'relative' }}>
                         <button 
                           onClick={() => deleteRecord(record.id)}
                           style={{ position: 'absolute', top: '12px', right: '12px', border: 'none', background: '#FEF2F2', color: '#EF4444', padding: '6px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
                           title="删除此记录"
                         >
                           🗑️ 删除
                         </button>
                         <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.85rem' }}>
                            <span style={{ background: '#6366F1', color: '#fff', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>第 {record.localId} 次就诊</span>
                            <span style={{ color: '#64748B', marginRight: '60px' }}>{new Date(record.createdAt).toLocaleString()}</span>
                         </div>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            {['subjective', 'objective', 'assessment', 'plan'].map(f => (
                              <div key={f}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#64748B' }}>{f.toUpperCase()}:</p>
                                <p style={{ fontSize: '0.85rem', color: '#1E293B' }}>{record[f] || '--'}</p>
                              </div>
                            ))}
                         </div>
                      </div>
                   ))}
                 </div>
               )}
            </div>
            <div className="modal-footer" style={{ padding: '12px 20px', borderTop: '1px solid #E2E8F0', textAlign: 'right' }}>
               <button className="btn-secondary" onClick={() => setIsHistoryOpen(false)} style={{ height: '32px', padding: '0 16px', borderRadius: '6px' }}>关闭</button>
            </div>
          </div>
        </div>
      )}

      {/* Modern Save Confirmation Modal */}
      {isSaveModalOpen && (
        <div className="overlay" style={{ zIndex: 1100 }} onClick={(e) => { if (e.target === e.currentTarget) setIsSaveModalOpen(false); }}>
          <div className="modal animate-scale-up" style={{ maxWidth: '480px', borderRadius: '20px', padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '24px', textAlign: 'center', background: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', color: '#fff' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>📋</div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>请核核对处方及病历信息</h2>
              <p style={{ fontSize: '0.85rem', opacity: 0.9 }}>确认签发给【{selectedPet?.petName}】</p>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '16px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem', color: '#64748B' }}>
                  <span>处方项数:</span>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>{currentEmr.prescriptions.length} 项</span>
                </div>
                <div style={{ overflowY: 'auto', maxHeight: '120px', marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {currentEmr.prescriptions.map((p: any) => (
                    <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#475569' }}>
                      <span>• {p.med.name}</span>
                      <span>×{p.amount}{p.med.unit}</span>
                    </div>
                  ))}
                  {currentEmr.prescriptions.length === 0 && <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>⚠️ 本次就诊未开具药品处方</span>}
                </div>
                <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 700, color: '#1E293B' }}>合计总额:</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 900, color: '#EF4444' }}>¥{currentEmr.prescriptions.reduce((sum: number, p: any) => sum + (Number(p.amount) * Number(p.med.price || 0)), 0).toFixed(2)}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setIsSaveModalOpen(false)} style={{ flex: 1, height: '48px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700 }}>取消</button>
                <button className="btn-primary" onClick={saveEMR} style={{ flex: 1, height: '48px', borderRadius: '12px', background: '#6366f1', color: '#fff', fontSize: '1rem', fontWeight: 700, boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)' }}>确定签发</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
