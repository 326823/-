import { useState, useEffect } from 'react';

interface BillingRecord {
  id: string;
  petName: string;
  ownerName: string;
  items: { name: string; price: number; amount: number; unit: string }[];
  total: number;
  date: string;
  status: 'pending' | 'settled';
}

export default function Billing({ initialData }: { initialData?: any }) {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'settled'>('pending');
  const [currentViewBill, setCurrentViewBill] = useState<BillingRecord | null>(null);
  
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payMethod, setPayMethod] = useState<'wechat' | 'alipay' | 'card'>('wechat');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (initialData) {
       const newBill: BillingRecord = {
          id: `BILL-${Date.now()}`,
          petName: initialData.petName,
          ownerName: initialData.ownerName,
          items: initialData.prescriptions.map((p: any) => ({
             name: p.med.name,
             price: p.med.price,
             amount: p.amount,
             unit: p.med.unit
          })),
          total: initialData.prescriptions.reduce((sum: number, p: any) => sum + (p.med.price * p.amount), 0) + 150.00, // include inpatient fee
          date: new Date().toISOString().split('T')[0],
          status: 'pending'
       };
       setBills(prev => [newBill, ...prev]);
       setCurrentViewBill(newBill);
    }
  }, [initialData]);

  const handleCommitPayment = async () => {
    setIsProcessing(true);
    // Simulate API call to /payments
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (currentViewBill) {
        setBills(prev => prev.map(b => b.id === currentViewBill.id ? { ...b, status: 'settled' } : b));
        setCurrentViewBill({ ...currentViewBill, status: 'settled' });
    }
    
    setIsProcessing(false);
    setIsPayModalOpen(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredBills = bills.filter(b => b.status === activeTab);

  return (
    <div className="page-container animate-fade-in" style={{ padding: '32px' }}>
      <div className="table-toolbar" style={{ marginBottom: '24px' }}>
        <div>
          <h1 className="page-title">💰 收银结算与财务流水</h1>
          <p style={{ color: 'var(--text-muted)' }}>待结单据及历史账单的全链路闭环核销中心</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
            <span style={{ fontSize: '0.85rem', padding: '8px 16px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '12px' }}>
                今日累计营收：<strong style={{color: '#10B981'}}>¥ {bills.filter(b=>b.status==='settled').reduce((s,b)=>s+b.total, 0).toFixed(2)}</strong>
            </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: currentViewBill ? '1fr 420px' : '1fr', gap: '32px' }}>
         {/* Bills List */}
         <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#F8FAFC' }}>
               <button onClick={() => setActiveTab('pending')} style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'pending' ? '#fff' : 'none', fontWeight: 800, color: activeTab === 'pending' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: activeTab === 'pending' ? '3px solid var(--primary)' : 'none' }}>待结单据 ({bills.filter(b=>b.status==='pending').length})</button>
               <button onClick={() => setActiveTab('settled')} style={{ flex: 1, padding: '16px', border: 'none', background: activeTab === 'settled' ? '#fff' : 'none', fontWeight: 800, color: activeTab === 'settled' ? 'var(--primary)' : 'var(--text-muted)', cursor: 'pointer', borderBottom: activeTab === 'settled' ? '3px solid var(--primary)' : 'none' }}>结算大账 ({bills.filter(b=>b.status==='settled').length})</button>
            </div>
            
            <div style={{ padding: '0' }}>
               <table className="data-grid" style={{ marginTop: '0' }}>
                  <thead>
                    <tr>
                       <th>单号</th>
                       <th>宠物/主人</th>
                       <th>费用项</th>
                       <th>总计金额</th>
                       <th>日期</th>
                       <th style={{textAlign: 'right'}}>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                     {filteredBills.map(bill => (
                        <tr key={bill.id} onClick={() => setCurrentViewBill(bill)} style={{ cursor: 'pointer', background: currentViewBill?.id === bill.id ? 'var(--bg-app)' : 'none' }}>
                           <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{bill.id.slice(0, 12)}</td>
                           <td style={{ fontWeight: 800 }}>{bill.petName} / {bill.ownerName}</td>
                           <td>{bill.items.length + 1} 项</td>
                           <td style={{ fontWeight: 900, color: 'var(--primary)' }}>¥ {bill.total.toFixed(2)}</td>
                           <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{bill.date}</td>
                           <td style={{ textAlign: 'right' }}>
                              {bill.status === 'pending' ? (
                                  <button className="btn-primary" onClick={(e) => { e.stopPropagation(); setCurrentViewBill(bill); setIsPayModalOpen(true); }} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>立即收银</button>
                              ) : (
                                  <span style={{ color: '#10B981', fontSize: '0.75rem', fontWeight: 900 }}>● 已入账</span>
                              )}
                           </td>
                        </tr>
                     ))}
                     {filteredBills.length === 0 && (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '100px', color: 'var(--text-muted)' }}>暂无该类目单据数据</td></tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>

         {/* Receipt View */}
         {currentViewBill && (
             <div className="card print-receipt" style={{ padding: '40px', background: '#fff', border: '1px solid var(--border)', position: 'relative' }}>
                {currentViewBill.status === 'settled' && (
                    <div style={{ position: 'absolute', top: '20px', right: '20px', width: '100px', height: '100px', border: '4px solid #10B981', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 900, transform: 'rotate(-20deg)', opacity: 0.6 }}>已结清</div>
                )}
                
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                   <h2 style={{ fontSize: '1.2rem', fontWeight: 900, margin: '0 0 8px 0' }}>宠爱之城动物医院</h2>
                   <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>费用明细/结算小票</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', fontSize: '0.85rem' }}>
                   <div>
                      <p style={{margin: '4px 0'}}>单号: {currentViewBill.id}</p>
                      <p style={{margin: '4px 0'}}>宠物: <strong>{currentViewBill.petName}</strong></p>
                   </div>
                   <div style={{textAlign: 'right'}}>
                      <p style={{margin: '4px 0'}}>日期: {currentViewBill.date}</p>
                      <p style={{margin: '4px 0'}}>主人: {currentViewBill.ownerName}</p>
                   </div>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
                   <thead>
                      <tr style={{ borderBottom: '2px solid var(--border)', fontSize: '0.85rem' }}>
                         <th style={{ textAlign: 'left', padding: '12px 0' }}>项目/耗材</th>
                         <th style={{ textAlign: 'center' }}>单价</th>
                         <th style={{ textAlign: 'center' }}>数量</th>
                         <th style={{ textAlign: 'right' }}>小计</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentViewBill.items.map((item, idx) => (
                         <tr key={idx} style={{ fontSize: '0.85rem', borderBottom: '1px dashed var(--border)' }}>
                            <td style={{ padding: '12px 0' }}>{item.name}</td>
                            <td style={{ textAlign: 'center' }}>¥{item.price}</td>
                            <td style={{ textAlign: 'center' }}>{item.amount} {item.unit}</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>¥{(item.price * item.amount).toFixed(2)}</td>
                         </tr>
                      ))}
                      <tr style={{ fontSize: '0.85rem', borderBottom: '1px dashed var(--border)' }}>
                            <td style={{ padding: '12px 0' }}>住院照护/床位费</td>
                            <td style={{ textAlign: 'center' }}>¥150.00</td>
                            <td style={{ textAlign: 'center' }}>1 期</td>
                            <td style={{ textAlign: 'right', fontWeight: 700 }}>¥150.0</td>
                      </tr>
                   </tbody>
                </table>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid var(--text-main)', paddingTop: '20px' }}>
                   <h3 style={{ margin: 0, fontWeight: 900 }}>合计应收：</h3>
                   <h3 style={{ margin: 0, fontWeight: 900, color: 'var(--primary)', fontSize: '1.5rem' }}>¥ {currentViewBill.total.toFixed(2)}</h3>
                </div>

                <div style={{ marginTop: '50px', paddingTop: '20px', borderTop: '1px solid var(--border)', fontSize: '0.75rem', color: '#94A3B8', textAlign: 'center' }}>
                   感谢您的信任 · 祝宠物早日康复
                </div>

                <div className="no-print" style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                   {currentViewBill.status === 'pending' && (
                       <button onClick={() => setIsPayModalOpen(true)} style={{ flex: 1, padding: '12px', background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>💳 立即收银</button>
                   )}
                   <button onClick={handlePrint} style={{ flex: 1, padding: '12px', background: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '10px', fontWeight: 900, cursor: 'pointer' }}>🖨️ 打印流水</button>
                </div>
             </div>
         )}
      </div>

      {/* Payment Gateway Modal */}
      {isPayModalOpen && currentViewBill && (
          <div className="overlay" style={{ zIndex: 2000 }} onClick={e => e.target === e.currentTarget && setIsPayModalOpen(false)}>
              <div className="modal animate-slide-up" style={{ width: '480px', borderRadius: '32px', padding: '40px', textAlign: 'center' }}>
                 <div style={{ marginBottom: '24px' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>应收总额</span>
                    <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--primary)', margin: '8px 0' }}>¥ {currentViewBill.total.toFixed(2)}</h2>
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '32px' }}>
                    <div onClick={() => setPayMethod('wechat')} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${payMethod === 'wechat' ? '#07C160' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                       <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💬</div>
                       <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>微信支付</span>
                    </div>
                    <div onClick={() => setPayMethod('alipay')} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${payMethod === 'alipay' ? '#1677FF' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                       <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>🔹</div>
                       <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>支付宝</span>
                    </div>
                    <div onClick={() => setPayMethod('card')} style={{ padding: '16px', borderRadius: '16px', border: `2px solid ${payMethod === 'card' ? 'var(--primary)' : 'var(--border)'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
                       <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>💳</div>
                       <span style={{ fontSize: '0.8rem', fontWeight: 800 }}>刷卡/现金</span>
                    </div>
                 </div>

                 <div style={{ background: '#F8FAFC', borderRadius: '24px', padding: '32px', marginBottom: '32px', position: 'relative' }}>
                    {isProcessing ? (
                        <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                           <div className="spinner" style={{ width: '40px', height: '40px', border: '4px solid #E2E8F0', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                           <p style={{ marginTop: '16px', fontWeight: 700, color: 'var(--text-muted)' }}>正在通讯请示银行网关...</p>
                        </div>
                    ) : (
                        <div style={{ height: '160px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '120px', height: '120px', background: '#fff', border: '1px solid #E2E8F0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                {/* Mock QR Code UI */}
                                <div style={{ width: '100px', height: '100px', background: payMethod === 'wechat' ? '#07C160' : payMethod === 'alipay' ? '#1677FF' : '#64748B', opacity: 0.1, borderRadius: '8px' }}></div>
                                <div style={{ position: 'absolute', fontSize: '2rem' }}>{payMethod === 'wechat' ? '💬' : payMethod === 'alipay' ? '🔹' : '📱'}</div>
                            </div>
                            <p style={{ marginTop: '16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>请扫描动态二维码进行支付</p>
                        </div>
                    )}
                 </div>

                 <button 
                  disabled={isProcessing} 
                  onClick={handleCommitPayment}
                  style={{ width: '100%', padding: '16px', background: isProcessing ? '#94A3B8' : 'var(--primary)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 900, fontSize: '1.1rem', cursor: isProcessing ? 'not-allowed' : 'pointer', boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.4)' }}
                 >
                    {isProcessing ? '处理中...' : '我已确认收到款项'}
                 </button>
                 
                 <p style={{ marginTop: '16px', fontSize: '0.75rem', color: '#94A3B8' }}>安全加密通道由 Antigravity Pay 提供技术支持</p>
              </div>
          </div>
      )}

      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .animate-slide-up { animation: slideUp 0.4s ease-out; }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @media print {
          .no-print, .main-area, .sidebar, .table-toolbar, .table-toolbar *, .card:not(.print-receipt) {
            display: none !important;
          }
          body, .app-layout, .main-area, .content-wrapper, .page-container {
            background: #fff !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-receipt {
             position: fixed;
             top: 0;
             left: 0;
             width: 100vw;
             height: 100vh;
             border: none !important;
             box-shadow: none !important;
             display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
