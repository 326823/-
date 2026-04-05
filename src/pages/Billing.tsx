
import { useState, useEffect, useMemo, useCallback } from 'react';

interface BillingRecord {
  id: string;
  petName?: string;
  ownerName?: string;
  ownerPhone?: string;
  date?: string;
  total?: number;
  amount?: string | number;
  status: 'pending' | 'settled' | 'draft' | 'cancelled';
  items?: any; 
  type?: string;
  billType?: string;
  settleDate?: string;
}

export default function BillingPage() {
  const [bills, setBills] = useState<BillingRecord[]>([]);
  const [currentViewBill, setCurrentViewBill] = useState<BillingRecord | null>(null);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'settled' | 'redemption'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [sortOrder, setSortOrder] = useState<'time' | 'price'>('time');

  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' }>({
    show: false,
    message: '',
    type: 'success'
  });

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ show: true, message: msg, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const fetchBills = useCallback(() => {
    fetch('https://houduan-hlb1.onrender.com/payments')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
           setBills(data);
           
           // 🔄 纠偏同步：如果右侧正在开启的单子已经结算完成了，直接关掉它（已翻篇）
           setCurrentViewBill(prev => {
              if (!prev) return null;
              const updated = data.find((b: any) => b.id === prev.id);
              if (updated && updated.status === 'settled' && prev.status !== 'settled') {
                 showNotification('该流水已在移动端完成结算 ✅');
                 return null; // 自动关闭
              }
              return updated || prev;
           });
        }
      });
  }, []);

  useEffect(() => {
    fetchBills();
    const interval = setInterval(() => fetchBills(), 5000);
    return () => clearInterval(interval);
  }, [fetchBills]);

  const getPrice = (bill: any) => Number(bill?.total || bill?.amount || 0);

  const filteredAndSortedBills = useMemo(() => {
    let result = bills.filter(bill => {
      const isRedemption = bill.billType === 'redemption';
      
      if (activeTab === 'redemption') {
         if (!isRedemption) return false;
      } else {
         if (isRedemption) return false; // 不计入日常现金流水
         
         const tabMatch = activeTab === 'all' || 
                           (activeTab === 'pending' && (bill.status === 'pending' || bill.status === 'draft')) ||
                           (activeTab === 'settled' && bill.status === 'settled');
         if (!tabMatch) return false;
      }

      const typeKey = (bill.billType || bill.type || '').toLowerCase();
      const typeMatch = selectedType === 'all' || 
                        (selectedType === 'pharmacy' && (typeKey.includes('pharmacy') || typeKey.includes('药品'))) ||
                        (selectedType === 'registration' && typeKey.includes('reg'));
      if (!typeMatch) return false;

      const query = searchQuery.toLowerCase();
      return !query || 
             bill.id.toLowerCase().includes(query) ||
             (bill.petName || '').toLowerCase().includes(query) ||
             (bill.ownerPhone || '').includes(query);
    });

    return result.sort((a, b) => {
      if (sortOrder === 'price') return getPrice(b) - getPrice(a);
      return b.id.localeCompare(a.id);
    });
  }, [bills, activeTab, selectedType, searchQuery, sortOrder]);

  // 🚀 找回丢失的核心函数：推送支付
  const handlePushPayment = async (e: any, bill: BillingRecord) => {
    e.stopPropagation();
    try {
      const res = await fetch(`https://houduan-hlb1.onrender.com/payments/${bill.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pending' })
      });
      if (res.ok) {
        showNotification('已推送到患者手机端 ✅');
        fetchBills();
        // 同步更新本地状态，让详情页立即反馈
        if (currentViewBill && currentViewBill.id === bill.id) {
           setCurrentViewBill({ ...bill, status: 'pending' });
        }
      }
    } catch (err) {
      showNotification('通讯故障 ❌', 'error');
    }
  };

  return (
    <div className="admin-container" style={{ padding: '24px', height: '100vh', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', overflow: 'hidden', background: '#F1F5F9' }}>
      
      {/* 🎊 全局 Toast */}
      {toast.show && (
        <div style={{ position: 'fixed', top: '24px', left: '50%', transform: 'translateX(-50%)', zIndex: 10000, padding: '12px 24px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(10px)', border: `1px solid ${toast.type === 'success' ? '#10B981' : '#EF4444'}`, boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
          <span style={{ fontWeight: 800, color: '#1E293B' }}>{toast.message}</span>
        </div>
      )}

      {/* 🔝 顶部工具栏 (修复宽度截断) */}
      <div className="card shadow-sm mb-4" style={{ background: '#fff', borderRadius: '16px', padding: '0 24px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '80px' }}>
              <div style={{ display: 'flex', gap: '20px', height: '100%', alignItems: 'center' }}>
                  <div onClick={() => setActiveTab('all')} style={{ cursor: 'pointer', fontWeight: 900, color: activeTab === 'all' ? '#6366F1' : '#94A3B8', borderBottom: activeTab === 'all' ? '4px solid #6366F1' : 'none', height: '100%', display: 'flex', alignItems: 'center', transition: '0.3s' }}>
                    📊 全部流水 ({bills.filter(b=>b.billType!=='redemption').length})
                  </div>
                  <div onClick={() => setActiveTab('pending')} style={{ cursor: 'pointer', fontWeight: 900, color: activeTab === 'pending' ? '#6366F1' : '#94A3B8', borderBottom: activeTab === 'pending' ? '4px solid #6366F1' : 'none', height: '100%', display: 'flex', alignItems: 'center', transition: '0.3s' }}>
                    💳 待结账 ({bills.filter(b=>b.billType!=='redemption' && (b.status==='draft'||b.status==='pending')).length})
                  </div>
                  <div onClick={() => setActiveTab('settled')} style={{ cursor: 'pointer', fontWeight: 900, color: activeTab === 'settled' ? '#6366F1' : '#94A3B8', borderBottom: activeTab === 'settled' ? '4px solid #6366F1' : 'none', height: '100%', display: 'flex', alignItems: 'center', transition: '0.3s' }}>
                    ✅ 已归档记录
                  </div>
                  <div onClick={() => setActiveTab('redemption')} style={{ cursor: 'pointer', fontWeight: 900, color: activeTab === 'redemption' ? '#F59E0B' : '#94A3B8', borderBottom: activeTab === 'redemption' ? '4px solid #F59E0B' : 'none', height: '100%', display: 'flex', alignItems: 'center', transition: '0.3s' }}>
                    🎁 积分台账 ({bills.filter(b=>b.billType==='redemption').length})
                  </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value as any)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 800, minWidth: '140px', background: '#F8FAFC', color: '#475569' }}>
                      <option value="time">⏱️ 先看最新生成</option>
                      <option value="price">💰 先看最高客单价</option>
                  </select>
                  <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} style={{ padding: '10px 12px', borderRadius: '12px', border: '1px solid #E2E8F0', fontWeight: 800, minWidth: '110px', background: '#F8FAFC' }}>
                      <option value="all">🔍 业务类型</option>
                      <option value="pharmacy">💊 药品订单</option>
                      <option value="registration">🏥 诊疗报告</option>
                  </select>
                  <input placeholder="🔍 宠物/电话/姓名" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ padding: '10px 14px', borderRadius: '12px', border: '1px solid #E2E8F0', width: '150px', outline: 'none' }} />
              </div>
          </div>
      </div>

      {/* 🚀 主体滚动布局 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px', flex: 1, overflow: 'hidden' }}>
        <div className="card shadow-sm" style={{ padding: '24px', background: '#fff', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
           <div style={{ overflowY: 'auto', flex: 1 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                 <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1, borderBottom: '2px solid #F1F5F9' }}>
                    <tr style={{ color: '#94A3B8', fontSize: '0.8rem', textAlign: 'left' }}>
                       <th style={{ padding: '16px 12px' }}>单号流水</th>
                       <th>宠物详请</th>
                       <th>金额合计</th>
                       <th>结算状态</th>
                       <th style={{ textAlign: 'right' }}>操作</th>
                    </tr>
                 </thead>
                 <tbody>
                    {filteredAndSortedBills.map(bill => (
                       <tr key={bill.id} style={{ borderBottom: '1px solid #F8FAFC' }}>
                          <td style={{ padding: '16px 12px', fontSize: '0.7rem', fontWeight: 600 }}>{bill.id}</td>
                          <td style={{ fontWeight: 800 }}>{bill.petName || '院内直购'}</td>
                          <td style={{ fontWeight: 900, color: bill.billType === 'redemption' ? '#F59E0B' : '#1E293B', fontSize: '1rem' }}>
                             {bill.billType === 'redemption' ? `${Math.abs(getPrice(bill))} 积分` : `¥ ${getPrice(bill).toFixed(2)}`}
                          </td>
                          <td>
                             <span style={{ 
                               padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: 800,
                               background: bill.status === 'settled' ? '#DCFCE7' : bill.status === 'draft' ? '#FEF3C7' : '#EFF6FF',
                               color: bill.status === 'settled' ? '#10B981' : bill.status === 'draft' ? '#B45309' : '#3B82F6'
                             }}>
                                {bill.status === 'settled' ? '● 已支付' : bill.status === 'draft' ? '待推送' : '📱 已推送'}
                             </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                             <button onClick={() => setCurrentViewBill(bill)} style={{ padding: '8px 16px', background: '#F1F5F9', color: '#6366F1', border: 'none', borderRadius: '10px', fontWeight: 800, cursor: 'pointer' }}>账单预览</button>
                          </td>
                       </tr>
                    ))}
                 </tbody>
              </table>
           </div>
        </div>

        <div className="receipt-view" style={{ overflowY: 'auto' }}>
           {currentViewBill ? (
              <div className="card shadow-sm" style={{ padding: '30px', background: '#fff', borderRadius: '24px', position: 'relative' }}>
                 {currentViewBill.status === 'settled' && (
                    <div style={{ position: 'absolute', top: '24px', right: '24px', border: '4px solid #10B981', color: '#10B981', borderRadius: '50%', padding: '12px 18px', fontWeight: 900, opacity: 0.3, transform: 'rotate(-20deg)', fontSize: '1.4rem' }}>PAID</div>
                 )}
                 <div style={{ textAlign: 'center', marginBottom: '24px', borderBottom: '2px dashed #E2E8F0', paddingBottom: '20px' }}>
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 900 }}>宠物医院结算凭证</h2>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: '#94A3B8' }}>{currentViewBill.date || '本日数据'} | 收费中心</p>
                 </div>

                 <div style={{ fontSize: '0.8rem', lineHeight: '2.5', background: '#F8FAFC', padding: '20px', borderRadius: '20px', marginBottom: '24px' }}>
                    <p style={{ margin: 0 }}>单据流水: {currentViewBill.id}</p>
                    <p style={{ margin: 0 }}>就治宠物: <strong>{currentViewBill.petName || '门诊患者'}</strong></p>
                    <p style={{ margin: 0 }}>业务性质: <span style={{ color: '#6366F1', fontWeight: 800 }}>{currentViewBill.type || currentViewBill.billType || '常规诊疗'}</span></p>
                    {currentViewBill.settleDate && (
                       <p style={{ margin: 0, color: '#10B981', fontWeight: 800 }}>⏰ 实付时间: {new Date(currentViewBill.settleDate).toLocaleString()}</p>
                    )}
                 </div>

                 <div style={{ minHeight: '140px' }}>
                    <table style={{ width: '100%', fontSize: '0.85rem' }}>
                       <thead style={{ color: '#94A3B8' }}>
                          <tr><th style={{ textAlign: 'left' }}>项目明细</th><th style={{ textAlign: 'right' }}>合计</th></tr>
                       </thead>
                       <tbody>
                          {Array.isArray(currentViewBill.items) && (currentViewBill.items as any[]).map((it, i) => (
                             <tr key={i}><td style={{padding: '8px 0'}}>{it.name} x{it.amount}</td><td style={{ textAlign: 'right' }}>¥{(it.price * it.amount).toFixed(2)}</td></tr>
                          ))}
                          {!Array.isArray(currentViewBill.items) && (
                             <tr>
                                <td style={{padding: '8px 0'}}>医院系统打包订单 ({String(currentViewBill.items || 1)})项</td>
                                <td style={{ textAlign: 'right' }}>¥ {getPrice(currentViewBill).toFixed(2)}</td>
                             </tr>
                          )}
                       </tbody>
                    </table>
                 </div>

                 <div style={{ borderTop: '3px solid #1E293B', paddingTop: '20px', display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem' }}>{currentViewBill.billType === 'redemption' ? '核销对应积分:' : '应收合计:'}</span>
                    <span style={{ fontWeight: 900, color: currentViewBill.billType === 'redemption' ? '#F59E0B' : '#EF4444', fontSize: '2rem' }}>
                        {currentViewBill.billType === 'redemption' ? `${Math.abs(getPrice(currentViewBill))} 分` : `¥ ${getPrice(currentViewBill).toFixed(2)}`}
                    </span>
                 </div>

                 <div style={{ marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {currentViewBill.status === 'draft' && (
                        <button onClick={(e) => handlePushPayment(e, currentViewBill)} style={{ padding: '16px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}>📱 推送支付回访提醒</button>
                    )}
                    {(currentViewBill.status === 'pending' || currentViewBill.status === 'draft') && (
                        <button onClick={() => setIsPayModalOpen(true)} style={{ padding: '16px', background: '#6366F1', color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900, cursor: 'pointer' }}>💰 柜台确认一键收银</button>
                    )}
                    <button onClick={() => window.print()} style={{ padding: '16px', background: '#f1f5f9', border: 'none', borderRadius: '14px', fontWeight: 800 }}>🖨️ 导出结算票据</button>
                 </div>
              </div>
           ) : (
              <div style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: '24px', border: '2px dashed #E2E8F0', color: '#94A3B8', fontWeight: 800 }}>🔍 请挑选流水进行核算</div>
           )}
        </div>
      </div>

      {/* 💎 重塑：高级毛玻璃收银弹窗 */}
      {isPayModalOpen && currentViewBill && (
          <div style={{ position: 'fixed', top:0, left:0, right:0, bottom:0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(12px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s' }}>
             <div style={{ background: '#fff', padding: '50px 40px', borderRadius: '40px', width: '380px', textAlign: 'center', boxShadow: '0 40px 100px -20px rgba(0,0,0,0.4)', animation: 'popIn 0.3s' }}>
                <div style={{ background: '#FEE2E2', width: '60px', height: '60px', borderRadius: '20px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', marginBottom: '20px' }}>💸</div>
                <p style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: 600, letterSpacing: '1px' }}>HIS 后台柜台代收确认</p>
                <h1 style={{ fontSize: '3.6rem', fontWeight: 950, margin: '15px 0', color: '#E11D48', fontVariantNumeric: 'tabular-nums' }}>
                   ¥ {getPrice(currentViewBill).toFixed(2)}
                </h1>
                <div style={{ padding: '15px', background: '#F8FAFC', borderRadius: '16px', marginBottom: '40px', fontSize: '0.85rem', color: '#64748B' }}>
                   单号：{currentViewBill.id.slice(-12)} <br/>
                   宠物：{currentViewBill.petName || '门诊录入'}
                </div>
                <div style={{ display: 'flex', gap: '16px' }}>
                   <button style={{ flex: 1, padding: '16px', background: '#f1f5f9', border: 'none', borderRadius: '16px', fontWeight: 800, color: '#475569', cursor: 'pointer' }} onClick={() => setIsPayModalOpen(false)}>返 回</button>
                   <button 
                     style={{ flex: 1, padding: '16px', background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)', color: '#fff', border: 'none', borderRadius: '16px', fontWeight: 800, cursor: 'pointer', boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.4)' }} 
                     onClick={async () => { 
                        const res = await fetch(`https://houduan-hlb1.onrender.com/payments/${currentViewBill.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'settled', paymentMethod: '柜台代付', settleDate: new Date().toISOString() }) });
                        if (res.ok) { setIsPayModalOpen(false); showNotification('入账结算成功，流水已归档'); fetchBills(); }
                     }}
                   >确认实收</button>
                </div>
             </div>
             <style>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
             `}</style>
          </div>
      )}
    </div>
  );
}
