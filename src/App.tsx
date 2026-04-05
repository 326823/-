import { useState, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Dashboard from './pages/Dashboard';
import Appointments from './pages/Appointments';
import PetRecords, { PetRecordsRef } from './pages/PetRecords';
import ComingSoon from './pages/ComingSoon';
import DoctorSchedule from './pages/DoctorSchedule';
import Inventory from './pages/Inventory';
import Inpatients from './pages/Inpatients';
import SOAPRecords from './pages/SOAPRecords';
import Diagnostics from './pages/Diagnostics';
import Billing from './pages/Billing';
import AccountManagement from './pages/AccountManagement';
import Login from './pages/Login';

export default function App() {
  const [userRole, setUserRole] = useState(() => localStorage.getItem('pet_his_role') || '');
  const [userName, setUserName] = useState(() => localStorage.getItem('pet_his_user') || '');
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('pet_his_user'));

  const [activeMenu, setActiveMenu] = useState('首页看板');
  const [searchQuery, setSearchQuery] = useState('');
  const petRecordsRef = useRef<PetRecordsRef>(null);

  const handleNavigateToBilling = async (data: any) => {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const billId = `BILL-${timestamp}-${random}`;
    
    const prescriptions = data.prescriptions || [];
    const newBill = {
       id: billId,
       petName: data.petName,
       ownerName: data.ownerName,
       ownerPhone: data.ownerPhone || '', // 用于推送给移动端
       items: prescriptions.map((p: any) => ({
          name: p.med?.name || '未知药品',
          price: p.med?.price || 0,
          amount: p.amount || 0,
          unit: p.med?.unit || '项'
       })),
       total: prescriptions.reduce((sum: number, p: any) => sum + ((p.med?.price || 0) * (p.amount || 0)), 0) + 150.00,
       date: new Date().toISOString().split('T')[0],
       createdAt: new Date().toISOString(),
       status: 'draft'
    };

    console.log("Pushing new Bill to Server:", newBill);

    try {
        const response = await fetch('https://houduan-hlb1.onrender.com/payments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newBill)
        });
        if (!response.ok) {
            alert(`云端账单同步失败: 服务器返回 ${response.status} 错误。请确认 mock-server 是否已重启以识别 payments 终点。`);
        } else {
            const result = await response.json();
            console.log("Server response for Bill sync:", result);
        }
        setActiveMenu('收银结算');
    } catch (err) {
        alert("无法连接 HIS 系统进行单据同步: " + err);
        console.error("Failed to sync bill:", err);
        setActiveMenu('收银结算');
    }
  };

  const handleLogin = (role: string, name: string) => {
    localStorage.setItem('pet_his_role', role);
    localStorage.setItem('pet_his_user', name);
    setUserRole(role);
    setUserName(name);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('pet_his_role');
    localStorage.removeItem('pet_his_user');
    setIsAuthenticated(false);
    setUserRole('');
    setUserName('');
  };

  const handleGlobalSearchFocus = () => {
    if (activeMenu !== '宠物档案与CRM') setActiveMenu('宠物档案与CRM');
  };

  const handleQuickAdd = () => {
    setActiveMenu('宠物档案与CRM');
    setTimeout(() => petRecordsRef.current?.openModal(), 0);
  };

  const renderContent = () => {
    switch(activeMenu) {
      case '首页看板': 
        return <Dashboard onNavigate={setActiveMenu} />;
      case '智能挂号排队': 
      case '挂号预约': 
        return <Appointments />;
      case '医生排班': 
        return <DoctorSchedule />;
      case '宠物档案与CRM': 
        return <PetRecords ref={petRecordsRef} searchQuery={searchQuery} />;
      case '电子病历(SOAP)':
        return <SOAPRecords />;
      case '化验与影像(PACS)':
        return <Diagnostics />;
      case '住院与手术': 
        return <Inpatients onNavigateToBilling={handleNavigateToBilling} />;
      case '收银结算':
        return <Billing />;
      case '智能库存': 
        return <Inventory />;
      case 'AI辅助医疗':
        return <ComingSoon title="AI辅助辅助医疗引擎" icon="🤖" desc="集成大模型。支持X光片中的疑似肿瘤/骨折AI高亮初筛预警" onGoHome={() => setActiveMenu('首页看板')} />;
      case '远程音视频问诊':
        return <ComingSoon title="远程医疗 (Telemedicine)" icon="💻" desc="基于 WebRTC 的在线看诊流" onGoHome={() => setActiveMenu('首页看板')} />;
      case 'IoT物联网监控':
        return <ComingSoon title="物联网硬件监测 (IoT Integrations)" icon="📡" desc="同步宠物智能项圈数据" onGoHome={() => setActiveMenu('首页看板')} />;
      case '账号与鉴权管理':
        return <AccountManagement userRole={userRole} />;
      default: 
        return <Dashboard onNavigate={setActiveMenu} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <Sidebar 
        activeMenu={activeMenu} 
        setActiveMenu={setActiveMenu} 
        userRole={userRole} 
        userName={userName}
        onLogout={handleLogout}
      />
      
      <div className="main-area">
        <Topbar 
          searchQuery={searchQuery} 
          setSearchQuery={setSearchQuery} 
          onSearchFocus={handleGlobalSearchFocus}
          onAddClick={handleQuickAdd}
          showSearch={activeMenu === '宠物档案与CRM'}
        />
        <div className="content-wrapper">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
