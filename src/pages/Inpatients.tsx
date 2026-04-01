import { useState, useEffect, useCallback } from 'react';
import { Inpatient, Doctor } from '../types';

const API_INPATIENTS = 'http://localhost:5000/inpatients';
const API_DOCTORS = 'http://localhost:5000/doctors';
const API_SOAP = 'http://localhost:5000/medical_records';

export default function Inpatients({ onNavigateToBilling }: { onNavigateToBilling: (data: any) => void }) {
  const [inpatients, setInpatients] = useState<Inpatient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [selectedInpatient, setSelectedInpatient] = useState<Inpatient | null>(null);
  const [medicalHistory, setMedicalHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false);
  const [inpatientToDischarge, setInpatientToDischarge] = useState<Inpatient | null>(null);
  const [formData, setFormData] = useState<Partial<Inpatient>>({ petName: '', type: '🐶 犬类', owner: '', room: '', diagnosis: '', status: '观察中', doctorId: 1 });

  const fetchInpatients = useCallback(async () => {
    setIsLoading(true);
    try {
      const [inRes, docRes, petRes] = await Promise.all([
        fetch(API_INPATIENTS).then(r => r.json()),
        fetch(API_DOCTORS).then(r => r.json()),
        fetch('http://localhost:5000/records').then(r => r.json())
      ]);
      setInpatients(inRes || []);
      setDoctors(docRes || []);
      setPets(petRes || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInpatients();
  }, [fetchInpatients]);

  const fetchLatestSOAP = async (petId: number) => {
    try {
        // Since Inpatient doesn't have petId, we assume petName + owner check OR just search by petName
        // In a real system we'd use ID. We'll search by petName as fallback if ID missing.
        const res = await fetch(`${API_SOAP}?petName=${selectedInpatient?.petName}&_sort=createdAt&_order=desc`);
        const data = await res.json();
        setMedicalHistory(data || []);
    } catch (err) {
        console.error("SOAP fetch failed", err);
    }
  };

  useEffect(() => {
    if (selectedInpatient) {
        fetchLatestSOAP(selectedInpatient.id);
    }
  }, [selectedInpatient]);

  const handleDischarge = async () => {
    if (!inpatientToDischarge) return;
    try {
      // 1. Prepare billing data from latest SOAP record
      const billData = {
          petName: inpatientToDischarge.petName,
          ownerName: inpatientToDischarge.owner,
          prescriptions: medicalHistory[0]?.prescriptions || []
      };

      // 2. Perform the physical discharge (delete from ward)
      await fetch(`${API_INPATIENTS}/${inpatientToDischarge.id}`, { method: 'DELETE' });
      
      // 3. Update local state
      setInpatients(prev => prev.filter(i => i.id !== inpatientToDischarge.id));
      setSelectedInpatient(null);
      setIsDischargeModalOpen(false);
      
      // 4. Navigate to Billing with data
      onNavigateToBilling(billData);
      
      setInpatientToDischarge(null);
    } catch {
      alert("出院办理失败");
    }
  };

  const handleCreateInpatient = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
        ...formData,
        admissionDate: new Date().toISOString().split('T')[0]
    };
    const res = await fetch(API_INPATIENTS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (res.ok) {
        const created = await res.json();
        setInpatients(prev => [...prev, created]);
        setIsModalOpen(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '危重': return '#EF4444';
      case '观察中': return '#F59E0B';
      case '稳定': return '#10B981';
      default: return '#64748B';
    }
  };

  const currentDoctor = doctors.find(d => d.id === selectedInpatient?.doctorId);

  return (
    <div className="page-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', background: '#F8FAFC' }}>
      
      {/* Header Bar */}
      <div style={{ background: '#fff', padding: '16px 32px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#1E293B', margin: 0 }}>🏥 住院与手术监护中心</h1>
          <p style={{ fontSize: '0.85rem', color: '#64748B', margin: '4px 0 0 0' }}>高频临床照护、术后康复监护及 ICU 危重症管理系统</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
             {selectedInpatient && (
                 <button onClick={() => setSelectedInpatient(null)} style={{ padding: '8px 16px', background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '10px', color: '#64748B', fontWeight: 700, cursor: 'pointer' }}>← 返回库区</button>
             )}
             <button onClick={() => {
                setFormData({ petName: '', type: '🐶 犬类', owner: '', diagnosis: '', status: '观察中', doctorId: 1, room: `B-${Math.floor(Math.random()*99 + 1)}` });
                setIsModalOpen(true);
             }} style={{ padding: '8px 20px', background: '#6366F1', border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 900, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.4)' }}>
                🏥 新建病房工单
             </button>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', display: 'flex', overflow: 'hidden' }}>
          
        {/* Main Dashboard / Detail Area */}
        <div style={{ flex: 1, padding: '32px', overflowY: 'auto' }}>
            {!selectedInpatient ? (
                // Ward Grid View
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                   {inpatients.map(p => (
                       <div key={p.id} onClick={() => setSelectedInpatient(p)} className="inpatient-card" style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0', cursor: 'pointer', transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: getStatusColor(p.status) }}></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                             <div>
                                <span style={{ fontSize: '0.75rem', fontWeight: 900, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ward Room {p.room}</span>
                                <h3 style={{ margin: '4px 0 0 0', fontSize: '1.25rem', fontWeight: 800, color: '#1E293B' }}>{p.petName}</h3>
                             </div>
                             <span style={{ fontSize: '1.5rem' }}>{p.type.split(' ')[0]}</span>
                          </div>
                          <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: '#64748B' }}>
                             <p style={{ margin: '4px 0' }}>🩺 诊断: <strong style={{ color: '#334155' }}>{p.diagnosis}</strong></p>
                             <p style={{ margin: '4px 0' }}>👤 主人: {p.owner}</p>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                             <span style={{ fontSize: '0.75rem', padding: '4px 12px', borderRadius: '20px', background: `${getStatusColor(p.status)}20`, color: getStatusColor(p.status), fontWeight: 900 }}>
                                ● {p.status}
                             </span>
                             <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>{p.admissionDate} 入院</span>
                          </div>
                       </div>
                   ))}
                   {/* Empty Bed Placeholder */}
                   <div onClick={() => setIsModalOpen(true)} style={{ background: 'transparent', borderRadius: '24px', padding: '24px', border: '2px dashed #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8', cursor: 'pointer', minHeight: '200px' }}>
                        <span style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🛏️</span>
                        <p style={{ fontWeight: 800 }}>空闲备用病室/隔离区</p>
                        <p style={{ fontSize: '0.8rem' }}>点击办理新入住手续</p>
                   </div>
                </div>
            ) : (
                // Nursing View (Detail View)
                <div className="animate-fade-in" style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '32px', maxWidth: '1400px', margin: '0 auto' }}>
                   {/* Left Col: Medical Orders & Monitoring */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      {/* Patient Banner */}
                      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0', display: 'flex', gap: '32px', alignItems: 'center' }}>
                         <div style={{ width: '100px', height: '100px', background: '#F1F5F9', borderRadius: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem' }}>{selectedInpatient.type.split(' ')[0]}</div>
                         <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                               <h2 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#1E293B' }}>{selectedInpatient.petName}</h2>
                               <span style={{ padding: '4px 12px', borderRadius: '20px', background: `${getStatusColor(selectedInpatient.status)}20`, color: getStatusColor(selectedInpatient.status), fontWeight: 900, fontSize: '0.85rem' }}>{selectedInpatient.status}</span>
                            </div>
                            <p style={{ color: '#64748B', display: 'flex', gap: '20px' }}>
                               <span>病房: <strong>{selectedInpatient.room}</strong></span>
                               <span>主人: <strong>{selectedInpatient.owner}</strong></span>
                               <span>类别: <strong>{selectedInpatient.type}</strong></span>
                            </p>
                         </div>
                         <button onClick={() => {
                             setInpatientToDischarge(selectedInpatient);
                             setIsDischargeModalOpen(true);
                         }} style={{ padding: '12px 24px', background: '#FEE2E2', border: 'none', borderRadius: '12px', color: '#B91C1C', fontWeight: 800, cursor: 'pointer' }}>办理出院</button>
                      </div>

                      {/* Unified Medical Orders (Ref SOAP) */}
                      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0' }}>
                         <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 900, color: '#1E293B' }}>📋 实时医疗医嘱执行列表</h3>
                            <span style={{ fontSize: '0.8rem', color: '#94A3B8' }}>同步自最近一次诊疗记录 (SOAP)</span>
                         </div>
                         
                         {medicalHistory.length > 0 ? (
                             <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                {/* Medication Orders */}
                                <div style={{ border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
                                   <div style={{ background: '#F8FAFC', padding: '12px 20px', fontSize: '0.9rem', fontWeight: 800, borderBottom: '1px solid #F1F5F9', color: '#6366F1' }}>💊 用药处方医嘱</div>
                                   <div style={{ padding: '0 20px' }}>
                                      {medicalHistory[0].prescriptions?.map((p: any) => (
                                          <div key={p.id} style={{ padding: '16px 0', borderBottom: '1px solid #F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                             <div>
                                                <p style={{ margin: 0, fontWeight: 700, color: '#1E293B' }}>{p.med.name}</p>
                                                <small style={{ color: '#94A3B8' }}>剂量: {p.amount} {p.med.unit}</small>
                                             </div>
                                             <button className="order-btn" style={{ background: '#EEF2FF', color: '#6366F1', border: 'none', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900, cursor: 'pointer' }}>签到执行</button>
                                          </div>
                                      ))}
                                   </div>
                                </div>

                                {/* Plan / Nursing Orders */}
                                <div style={{ border: '1px solid #F1F5F9', borderRadius: '16px', overflow: 'hidden' }}>
                                   <div style={{ background: '#F8FAFC', padding: '12px 20px', fontSize: '0.9rem', fontWeight: 800, borderBottom: '1px solid #F1F5F9', color: '#10B981' }}>🩺 诊疗/护理医嘱 (Plan)</div>
                                   <div style={{ padding: '20px', background: '#FFFBEB', minHeight: '100px' }}>
                                      <p style={{ margin: 0, color: '#92400E', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                         {medicalHistory[0].plan || "暂无具体诊疗计划描述，请联系主治医师确认。"}
                                      </p>
                                   </div>
                                </div>
                             </div>
                         ) : (
                             <div style={{ textAlign: 'center', padding: '40px', background: '#F8FAFC', borderRadius: '16px', color: '#94A3B8' }}>
                                <p>未找到该宠物的历史 SOAP 病历记录。请先在电子病历模块录入诊疗计划。</p>
                             </div>
                         )}
                      </div>
                      
                      {/* Treatment Log Input */}
                      <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0' }}>
                         <h3 style={{ margin: '0 0 20px 0', fontSize: '1.25rem', fontWeight: 900 }}>✍️ 填写护理日历/巡房记录</h3>
                         <textarea style={{ width: '100%', minHeight: '120px', border: '2px solid #F1F5F9', borderRadius: '16px', padding: '16px', marginBottom: '16px', outline: 'none', transition: 'border 0.2s' }} placeholder="输入巡房观察结果，如：呼吸平稳，精神状态好转，进食正常..."></textarea>
                         <button style={{ width: '100%', padding: '12px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '12px', fontWeight: 900, cursor: 'pointer' }}>保存护理记录</button>
                      </div>
                   </div>

                   {/* Right Col: Info & Monitoring */}
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                      {/* Doctor Info */}
                      <div style={{ background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                         <div style={{ width: '64px', height: '64px', background: '#6366F1', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px auto', fontSize: '1.5rem' }}>{currentDoctor?.avatar || '👨‍⚕️'}</div>
                         <h4 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', fontWeight: 800 }}>{currentDoctor?.name || '实习医生'}</h4>
                         <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>{currentDoctor?.title || '主职'} | {currentDoctor?.department || '通用科室'}</p>
                         <div style={{ marginTop: '16px', padding: '8px', background: '#F8FAFC', borderRadius: '12px', fontSize: '0.75rem', color: '#64748B' }}>
                            当前主治医师分配中
                         </div>
                      </div>

                      {/* Monitoring Metrics */}
                      <div style={{ background: '#1E293B', borderRadius: '24px', padding: '24px', color: '#fff' }}>
                         <h4 style={{ margin: '0 0 20px 0', fontSize: '1rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ color: '#EF4444' }}>●</span> ICU 极速监控指标
                         </h4>
                         <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                               <small style={{ color: '#94A3B8' }}>体温 ℃</small>
                               <div style={{ fontSize: '1.5rem', fontWeight: 900, margin: '4px 0' }}>38.6</div>
                               <small style={{ color: '#10B981' }}>- 正常范围</small>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '16px' }}>
                               <small style={{ color: '#94A3B8' }}>心率 bpm</small>
                               <div style={{ fontSize: '1.5rem', fontWeight: 900, margin: '4px 0' }}>110</div>
                               <small style={{ color: '#EF4444' }}>↑ 偏高警告</small>
                            </div>
                         </div>
                         <div style={{ marginTop: '20px', textAlign: 'center', padding: '12px', background: '#EF4444', borderRadius: '12px', fontWeight: 900, fontSize: '0.85rem' }}>
                            ⚠️ 生命体征预警触发
                         </div>
                      </div>

                      {/* Activity Logs */}
                      <div style={{ flex: 1, background: '#fff', borderRadius: '24px', padding: '24px', border: '1px solid #E2E8F0' }}>
                         <h3 style={{ margin: '0 0 16px 0', fontSize: '1rem', fontWeight: 800 }}>📂 最近生命迹象记录</h3>
                         <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {[1, 2, 3].map(i => (
                                <div key={i} style={{ padding: '12px', background: '#F8FAFC', borderRadius: '12px', border: '1px solid #F1F5F9' }}>
                                   <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: '#1E293B', fontWeight: 600 }}>09:00 AM - 巡房完成</p>
                                   <small style={{ color: '#94A3B8' }}>操作人：王护士</small>
                                </div>
                            ))}
                         </div>
                      </div>
                   </div>
                </div>
            )}
        </div>
      </div>

      {/* Creation Modal */}
      {isModalOpen && (
          <div className="overlay" style={{ zIndex: 1200 }} onClick={e => e.target === e.currentTarget && setIsModalOpen(false)}>
              <div className="modal" style={{ width: '600px', borderRadius: '24px', padding: '40px' }}>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 900, marginBottom: '24px', color: '#1E293B' }}>📝 录入新病房住院指令</h2>
                  <form onSubmit={handleCreateInpatient}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="input-group">
                                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>选择关联宠物 (From EMR)</label>
                                  <select 
                                    className="form-input" 
                                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }} 
                                    value={formData.petName} 
                                    onChange={e => {
                                        const pet = pets.find(p => p.petName === e.target.value);
                                        if (pet) {
                                            setFormData({
                                                ...formData,
                                                petName: pet.petName,
                                                owner: pet.ownerName,
                                                type: pet.type
                                            });
                                        }
                                    }} 
                                    required
                                  >
                                      <option value="">-- 请选择病员 --</option>
                                      {pets.map(p => (
                                          <option key={p.id} value={p.petName}>{p.petName} ({p.ownerName})</option>
                                      ))}
                                  </select>
                              </div>
                              <div className="input-group">
                                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>所属主人</label>
                                  <input className="form-input" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} value={formData.owner} readOnly placeholder="选择宠物后自动带入" />
                              </div>
                          </div>
                          
                          <div className="input-group">
                              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>临床诊断结论</label>
                              <input className="form-input" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }} value={formData.diagnosis} onChange={e => setFormData({...formData, diagnosis: e.target.value})} required placeholder="例如：急性胃扭转术后需观察" />
                          </div>

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                              <div className="input-group">
                                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>物种分类</label>
                                  <input className="form-input" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} value={formData.type} readOnly placeholder="自动识别" />
                              </div>
                              <div className="input-group">
                                  <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>预选房号</label>
                                  <input className="form-input" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0', background: '#F8FAFC' }} value={formData.room} readOnly />
                              </div>
                          </div>

                          <div className="input-group">
                              <label style={{ fontSize: '0.85rem', fontWeight: 800, color: '#64748B', marginBottom: '8px', display: 'block' }}>分类照管等级</label>
                              <select className="form-input" style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }} value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                                  <option value="危重">🔴 危重阶梯照护 (ICU)</option>
                                  <option value="观察中">🟡 标准床位 24H 观察</option>
                                  <option value="稳定">🟢 恢复室 (等待出院)</option>
                              </select>
                          </div>
                      </div>

                      <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
                          <button type="button" onClick={() => setIsModalOpen(false)} style={{ flex: 1, padding: '14px', background: '#F1F5F9', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#64748B', cursor: 'pointer' }}>取消</button>
                          <button type="submit" style={{ flex: 1, padding: '14px', background: '#6366F1', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>确认分配</button>
                      </div>
                  </form>
              </div>
          </div>
      )}

      {/* Discharge Confirmation Modal */}
      {isDischargeModalOpen && inpatientToDischarge && (
          <div className="overlay" style={{ zIndex: 1300 }} onClick={e => e.target === e.currentTarget && setIsDischargeModalOpen(false)}>
              <div className="modal" style={{ width: '400px', borderRadius: '24px', padding: '32px', textAlign: 'center' }}>
                  <div style={{ width: '80px', height: '80px', background: '#FEE2E2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px auto', fontSize: '2.5rem' }}>🏥</div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: '8px', color: '#1E293B' }}>办理出院确认</h2>
                  <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '32px' }}>
                      确定要为【<strong style={{color: '#1E293B'}}>{inpatientToDischarge.petName}</strong>】分配的病房 <strong style={{color: '#10B981'}}>{inpatientToDischarge.room}</strong> 办理结单出院并释放空床位吗？
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <button onClick={handleDischarge} style={{ padding: '14px', background: '#10B981', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#fff', cursor: 'pointer' }}>✅ 确认康复出院并释放床位</button>
                      <button onClick={() => setIsDischargeModalOpen(false)} style={{ padding: '14px', background: '#F1F5F9', border: 'none', borderRadius: '12px', fontWeight: 800, color: '#64748B', cursor: 'pointer' }}>取消操作</button>
                  </div>
              </div>
          </div>
      )}

      <style>{`
        .inpatient-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        .order-btn:hover {
          background: #6366F1 !important;
          color: #fff !important;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
          textarea:focus {
          border-color: #6366F1 !important;
        }
      `}</style>

    </div>
  );
}
