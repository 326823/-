import { useState, useEffect } from 'react';
import { PetRecord } from '../types';

const API_PETS = 'http://localhost:5000/records';
const API_LAB = 'http://localhost:5000/lab_results';
const API_PACS = 'http://localhost:5000/imaging_studies';

export default function Diagnostics() {
  const [pets, setPets] = useState<PetRecord[]>([]);
  const [selectedPet, setSelectedPet] = useState<PetRecord | null>(null);
  const [activeExamId, setActiveExamId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'LIS' | 'PACS'>('LIS');
  
  const [labData, setLabData] = useState<any[]>([]);
  const [pacsData, setPacsData] = useState<any[]>([]);
  
  const [isAddLabModalOpen, setIsAddLabModalOpen] = useState(false);
  const [isAddPacsModalOpen, setIsAddPacsModalOpen] = useState(false);

  const [newLab, setNewLab] = useState({
    testName: '常规全血细胞计数 (CBC)',
    date: new Date().toISOString().split('T')[0],
    results: [{ item: 'WBC', value: '', unit: '10^9/L', ref: '6.0-17.0', status: 'normal' }]
  });

  const [newPacs, setNewPacs] = useState({
    type: '数字化 X 线检查 (DR)',
    view: '腹腔正位',
    date: new Date().toISOString().split('T')[0],
    findings: '影像表现良好，实质未见明显渗出。',
    images: ['https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format']
  });

  useEffect(() => {
    fetch(API_PETS).then(res => res.json()).then(data => {
      setPets(data || []);
      if (data && data.length > 0) setSelectedPet(data[0]);
    });
  }, []);

  useEffect(() => {
    let isMounted = true;
    if (selectedPet) {
      Promise.all([
        fetch(`${API_LAB}?petId=${selectedPet.id}`).then(res => res.json()),
        fetch(`${API_PACS}?petId=${selectedPet.id}`).then(res => res.json())
      ]).then(([labs, pacs]) => {
        if (!isMounted) return;
        setLabData(labs || []);
        setPacsData(pacs || []);
        
        // Auto-select first item if none selected
        if (viewMode === 'LIS' && labs?.length > 0) setActiveExamId(labs[0].id);
        else if (viewMode === 'PACS' && pacs?.length > 0) setActiveExamId(pacs[0].id);
        else setActiveExamId(null);
      }).catch(err => console.error("Fetch error:", err));
    }
    return () => { isMounted = false; };
  }, [selectedPet, viewMode]);

  const saveNewLab = async () => {
    if (!selectedPet) return;
    try {
      const res = await fetch(API_LAB, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newLab, petId: selectedPet.id })
      });
      if (res.ok) {
        setIsAddLabModalOpen(false);
        const data = await fetch(`${API_LAB}?petId=${selectedPet.id}`).then(r => r.json());
        setLabData(data || []);
      }
    } catch {
      alert("化验保存失败");
    }
  };

  const saveNewPacs = async () => {
    if (!selectedPet) return;
    try {
      const res = await fetch(API_PACS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newPacs, petId: selectedPet.id })
      });
      if (res.ok) {
        setIsAddPacsModalOpen(false);
        const data = await fetch(`${API_PACS}?petId=${selectedPet.id}`).then(r => r.json());
        setPacsData(data || []);
      }
    } catch {
      alert("影像归档失败");
    }
  };

  const handleModeSwitch = (mode: 'LIS' | 'PACS') => {
    setViewMode(mode);
    setActiveExamId(null); 
  };

  const currentExam = viewMode === 'LIS' 
    ? (labData || []).find(l => l.id === activeExamId) 
    : (pacsData || []).find(p => p.id === activeExamId);

  return (
    <div className="page-container" style={{ padding: '0', display: 'flex', height: 'calc(100vh - 80px)', background: '#F1F5F9', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{ width: '320px', background: '#fff', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '24px', borderBottom: '1px solid #F1F5F9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
             <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#1E293B' }}>🔬 诊断详情</h2>
             <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={() => setIsAddLabModalOpen(true)} style={{ background: '#6366F1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>+ 化验</button>
                <button onClick={() => setIsAddPacsModalOpen(true)} style={{ background: '#0369A1', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 800 }}>+ 影像</button>
             </div>
          </div>
          <select 
            value={selectedPet?.id || ''} 
            onChange={(e) => {
              const pet = pets.find(p => p.id === Number(e.target.value));
              if (pet) {
                 setSelectedPet(pet);
                 setActiveExamId(null);
              }
            }}
            style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #E2E8F0', fontSize: '0.9rem', fontWeight: 600, background: '#F8FAFC' }}
          >
            {pets?.map(p => <option key={p.id} value={p.id}>{p.petName} ({p.ownerName})</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', padding: '12px 24px', gap: '8px', borderBottom: '1px solid #F1F5F9' }}>
          <button 
            onClick={() => handleModeSwitch('LIS')}
            style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', border: 'none', background: viewMode === 'LIS' ? '#6366F1' : '#F1F5F9', color: viewMode === 'LIS' ? '#fff' : '#64748B' }}
          >
            LIS 化验
          </button>
          <button 
            onClick={() => handleModeSwitch('PACS')}
            style={{ flex: 1, padding: '8px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: 800, cursor: 'pointer', border: 'none', background: viewMode === 'PACS' ? '#6366F1' : '#F1F5F9', color: viewMode === 'PACS' ? '#fff' : '#64748B' }}
          >
            PACS 影像
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {(viewMode === 'LIS' ? (labData || []) : (pacsData || [])).map(item => (
            <div 
              key={item.id} 
              onClick={() => setActiveExamId(item.id)}
              style={{ padding: '16px 24px', borderBottom: '1px solid #F8FAFC', cursor: 'pointer', background: activeExamId === item.id ? '#F0F9FF' : 'transparent', borderLeft: activeExamId === item.id ? '4px solid #0369A1' : '4px solid transparent' }}
            >
              <p style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1E293B', marginBottom: '4px' }}>{item.testName || item.type || '未命名报告'}</p>
              <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>📅 {item.date}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '40px' }}>
        {!currentExam ? (
          <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
             <p style={{ fontSize: '1.1rem' }}>请从左侧列表选择诊断报告</p>
          </div>
        ) : (
          <div key={currentExam.id + viewMode} className="animate-fade-in" style={{ maxWidth: '1000px' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                   <h1 style={{ fontSize: '1.8rem', fontWeight: 900, color: '#1E293B' }}>{currentExam.testName || currentExam.type}</h1>
                   <p style={{ color: '#64748B' }}>患宠: {selectedPet?.petName} | 日期: {currentExam.date}</p>
                </div>
                <button className="btn-secondary" onClick={() => window.print()} style={{ padding: '10px 20px', borderRadius: '10px', background: '#fff', border: '1px solid #E2E8F0', fontWeight: 700 }}>🖨️ 打印报告单</button>
             </div>

             {viewMode === 'LIS' ? (
                <div style={{ background: '#fff', borderRadius: '20px', border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                   <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead style={{ background: '#F8FAFC' }}>
                         <tr>
                            <th style={{ padding: '16px 24px', color: '#64748B' }}>项目</th>
                            <th style={{ padding: '16px 24px', color: '#64748B' }}>检测值</th>
                            <th style={{ padding: '16px 24px', color: '#64748B' }}>单位</th>
                            <th style={{ padding: '16px 24px', color: '#64748B' }}>参考值</th>
                            <th style={{ padding: '16px 24px', color: '#64748B' }}>状态</th>
                         </tr>
                      </thead>
                      <tbody>
                         {currentExam.results?.map((r: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                               <td style={{ padding: '20px 24px', fontWeight: 700 }}>{r.item}</td>
                               <td style={{ padding: '20px 24px', color: r.status !== 'normal' ? '#EF4444' : '#1E293B' }}>{r.value}</td>
                               <td style={{ padding: '20px 24px' }}>{r.unit}</td>
                               <td style={{ padding: '20px 24px' }}>{r.ref}</td>
                               <td style={{ padding: '20px 24px' }}>
                                  <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 900, background: r.status === 'normal' ? '#D1FAE5' : '#FEE2E2', color: r.status === 'normal' ? '#065F46' : '#991B1B' }}>
                                    {r.status === 'normal' ? '✓' : r.status === 'high' ? '↑' : '↓'}
                                  </span>
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                </div>
             ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                   <div style={{ background: '#000', borderRadius: '24px', padding: '24px' }}>
                      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto' }}>
                         {currentExam.images?.map((img: string, i: number) => (
                            <img key={i} src={img} style={{ height: '400px', borderRadius: '12px' }} alt="PACS" />
                         ))}
                      </div>
                   </div>
                   <div style={{ background: '#fff', borderRadius: '24px', padding: '32px', border: '1px solid #E2E8F0' }}>
                      <h3 style={{ fontWeight: 800, marginBottom: '16px' }}>📋 诊断结论</h3>
                      <p style={{ lineHeight: 1.8 }}>{currentExam.findings}</p>
                   </div>
                </div>
             )}
          </div>
        )}
      </div>

      {/* Lab Record Addition Modal */}
      {isAddLabModalOpen && (
        <div className="overlay" style={{ zIndex: 1300 }} onClick={e => e.target === e.currentTarget && setIsAddLabModalOpen(false)}>
           <div className="modal" style={{ width: '850px', borderRadius: '24px', padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 900 }}>📄 新增实验室化验单</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '32px' }}>
                 <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>报告名称</label>
                    <input className="form-input" value={newLab.testName} onChange={e => setNewLab({...newLab, testName: e.target.value})} />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>检测日期</label>
                    <input type="date" className="form-input" value={newLab.date} onChange={e => setNewLab({...newLab, date: e.target.value})} />
                 </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>检测指标详细录入</h3>
                    <button onClick={() => setNewLab({...newLab, results: [...newLab.results, { item: '', value: '', unit: '', ref: '', status: 'normal' }]})} style={{ border: 'none', background: 'none', color: '#6366F1', fontWeight: 700, cursor: 'pointer' }}>+ 添加项目</button>
                 </div>
                 <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                       <thead style={{ background: '#F8FAFC' }}>
                          <tr>
                             <th style={{ padding: '8px', fontSize: '0.8rem' }}>项目</th>
                             <th style={{ padding: '8px', fontSize: '0.8rem' }}>结果值</th>
                             <th style={{ padding: '8px', fontSize: '0.8rem' }}>单位</th>
                             <th style={{ padding: '8px', fontSize: '0.8rem' }}>参考范围</th>
                             <th style={{ padding: '8px', fontSize: '0.8rem' }}>状态</th>
                          </tr>
                       </thead>
                       <tbody>
                          {newLab.results.map((r, i) => (
                             <tr key={i}>
                                <td><input className="form-input" style={{ width: '150px' }} value={r.item} onChange={e => { const copy = [...newLab.results]; copy[i].item = e.target.value; setNewLab({...newLab, results: copy}); }} /></td>
                                <td><input className="form-input" style={{ width: '80px' }} value={r.value} onChange={e => { const copy = [...newLab.results]; copy[i].value = e.target.value; setNewLab({...newLab, results: copy}); }} /></td>
                                <td><input className="form-input" style={{ width: '80px' }} value={r.unit} onChange={e => { const copy = [...newLab.results]; copy[i].unit = e.target.value; setNewLab({...newLab, results: copy}); }} /></td>
                                <td><input className="form-input" style={{ width: '120px' }} value={r.ref} onChange={e => { const copy = [...newLab.results]; copy[i].ref = e.target.value; setNewLab({...newLab, results: copy}); }} /></td>
                                <td>
                                   <select className="form-input" value={r.status} onChange={e => { const copy = [...newLab.results]; copy[i].status = e.target.value; setNewLab({...newLab, results: copy}); }}>
                                      <option value="normal">正常</option>
                                      <option value="high">偏高 ↑</option>
                                      <option value="low">偏低 ↓</option>
                                   </select>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                 </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '40px' }}>
                 <button className="btn-secondary" onClick={() => setIsAddLabModalOpen(false)} style={{ flex: 1, borderRadius: '12px', height: '48px' }}>取消</button>
                 <button className="btn-primary" onClick={saveNewLab} style={{ flex: 1, borderRadius: '12px', height: '48px' }}>保存报告单</button>
              </div>
           </div>
        </div>
      )}

      {/* Pacs Addition Modal */}
      {isAddPacsModalOpen && (
        <div className="overlay" style={{ zIndex: 1300 }} onClick={e => e.target === e.currentTarget && setIsAddPacsModalOpen(false)}>
           <div className="modal" style={{ width: '600px', borderRadius: '24px', padding: '32px' }}>
              <h2 style={{ marginBottom: '24px', fontSize: '1.4rem', fontWeight: 900 }}>🖼️ 归档 PACS 影像记录</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                 <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>影像类型 / 设备</label>
                    <input className="form-input" value={newPacs.type} onChange={e => setNewPacs({...newPacs, type: e.target.value})} />
                 </div>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>拍摄部位</label>
                       <input className="form-input" value={newPacs.view} onChange={e => setNewPacs({...newPacs, view: e.target.value})} />
                    </div>
                    <div>
                       <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>拍摄日期</label>
                       <input type="date" className="form-input" value={newPacs.date} onChange={e => setNewPacs({...newPacs, date: e.target.value})} />
                    </div>
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>诊断结论 / 影像表现</label>
                    <textarea 
                      className="form-input" 
                      style={{ height: '100px', resize: 'none' }}
                      value={newPacs.findings}
                      onChange={e => setNewPacs({...newPacs, findings: e.target.value})}
                    />
                 </div>
                 <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#64748B', marginBottom: '8px' }}>影像 URL 地址 (云端路径)</label>
                    <input className="form-input" value={newPacs.images[0]} onChange={e => setNewPacs({...newPacs, images: [e.target.value]})} />
                 </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '32px' }}>
                 <button className="btn-secondary" onClick={() => setIsAddPacsModalOpen(false)} style={{ flex: 1, borderRadius: '12px', height: '48px' }}>取消</button>
                 <button className="btn-primary" onClick={saveNewPacs} style={{ flex: 1, borderRadius: '12px', height: '48px', background: '#0369A1' }}>确认归档</button>
              </div>
           </div>
        </div>
      )}
      
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          .animate-fade-in, .animate-fade-in * { visibility: visible !important; }
          .animate-fade-in { position: absolute; left: 0; top: 0; width: 100%; }
          .page-container, .sidebar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
