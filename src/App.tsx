import { useState, useRef } from 'react';
import { Analytics } from '@vercel/analytics/react';
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
  const [billingData, setBillingData] = useState<any>(null);
  
  const petRecordsRef = useRef<PetRecordsRef>(null);

  const handleNavigateToBilling = (data: any) => {
    setBillingData(data);
    setActiveMenu('收银结算');
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

  // Map old route names and new route names smoothly
  const renderContent = () => {
    switch(activeMenu) {
      // 1. Foundation
      case '首页看板': 
        return <Dashboard onNavigate={setActiveMenu} />;
      case '智能挂号排队': 
        return <Appointments />;
      case '挂号预约': 
        return <Appointments />; // fallback
      case '医生排班': 
        return <DoctorSchedule />;
      
      // 2. Clinical
      case '宠物档案与CRM': 
        return <PetRecords ref={petRecordsRef} searchQuery={searchQuery} />;
      case '电子病历(SOAP)':
        return <SOAPRecords />;
      case '化验与影像(PACS)':
        return <Diagnostics />;
      case '住院与手术': 
        return <Inpatients onNavigateToBilling={handleNavigateToBilling} />;

      // 3. Supply & Billing
      case '收银结算':
        return <Billing initialData={billingData} />;
      case '智能库存': 
        return <Inventory />;
        
      // 4. AI & Advanced
      case 'AI辅助医疗':
        return <ComingSoon title="AI辅助辅助医疗引擎" icon="🤖" desc="集成大模型。医生输入『呕吐、细小阴性』即可由AI扩写为标准病历描述。支持X光片中的疑似肿瘤/骨折AI高亮初筛预警" onGoHome={() => setActiveMenu('首页看板')} />;
      case '远程音视频问诊':
        return <ComingSoon title="远程医疗 (Telemedicine)" icon="💻" desc="基于 WebRTC 的音视频在线看诊流，允许术后复查客户呼入视频通话并同步病历记录" onGoHome={() => setActiveMenu('首页看板')} />;
      case 'IoT物联网监控':
        return <ComingSoon title="物联网硬件监测 (IoT Integrations)" icon="📡" desc="同步宠物智能项圈（心率/睡眠数据）。对接基站式病房温湿度传感器，异常状态自动触发医生前台告警" onGoHome={() => setActiveMenu('首页看板')} />;

      // 5. System Settings
      case '账号与鉴权管理':
        return <AccountManagement />;

      default: 
        return <Dashboard onNavigate={setActiveMenu} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <>
        <Login onLogin={handleLogin} />
        <Analytics />
      </>
    );
  }

  return (
    <>
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
      <Analytics />
    </>
  );
}
