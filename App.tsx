import React from 'react';
import { useApp } from './contexts/AppContext';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Patients from './pages/Patients';
import Visits from './pages/Visits';
import Diagnosis from './pages/Diagnosis';
import Users from './pages/Users';
import Clinics from './pages/Clinics';
import Reports from './pages/Reports';
import Queue from './pages/Queue';
import ManualRevenue from './pages/ManualRevenue';
import Revenues from './pages/Revenues';
import Doctors from './pages/Doctors';
import MedicalReport from './pages/MedicalReport';
import DailyClinicReport from './pages/DailyClinicReport';
import Settings from './pages/Settings';
import Documentation from './pages/Documentation';
import Optimization from './pages/Optimization';
import Disbursements from './pages/Disbursements';
import PaymentVouchers from './pages/PaymentVouchers';
import DisbursementsReport from './pages/DisbursementsReport';
import { Role } from './types';

const App: React.FC = () => {
  const { user, currentView, loading, error, clinicLogo } = useApp();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'patients':
        return <Patients />;
      case 'visits':
        return <Visits />;
      case 'diagnosis':
        return <Diagnosis />;
      case 'users':
        return <Users />;
      case 'clinics':
        return <Clinics />;
      case 'doctors':
        return <Doctors />;
      case 'reports':
        return <Reports />;
      case 'medical-report':
        return <MedicalReport />;
      case 'daily-clinic-report':
        return <DailyClinicReport />;
      case 'disbursements-report':
        return <DisbursementsReport />;
      case 'queue':
        return <Queue />;
      case 'manual-revenue':
        return <ManualRevenue />;
      case 'revenues':
        return <Revenues />;
      case 'disbursements':
        return <Disbursements />;
      case 'payment-vouchers':
        return <PaymentVouchers />;
      case 'settings':
        return <Settings />;
      case 'documentation':
        return <Documentation />;
      case 'optimization':
        return <Optimization />;
      default:
        return <Dashboard />;
    }
  };
  
  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
            <div className="text-center">
                {clinicLogo ? (
                    <img src={clinicLogo} alt="شعار المستوصف" className="mx-auto h-32 w-auto object-contain animate-pulse" />
                ) : (
                    <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-teal-500 mx-auto"></div>
                )}
                <h2 className="mt-4 text-xl font-semibold text-gray-700 dark:text-gray-300">جاري تحميل البيانات...</h2>
                <p className="text-gray-500 dark:text-gray-400">يرجى الانتظار لحظات</p>
            </div>
        </div>
    );
  }

  if (error) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
              <div className="text-center bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-red-200 dark:border-red-700">
                  <h2 className="text-2xl font-bold text-red-700">حدث خطأ في الاتصال</h2>
                  <p className="text-gray-600 dark:text-gray-300 mt-2">لا يمكن الاتصال بالخادم. يرجى التحقق من صحة رابط الـ API أو المحاولة مرة أخرى لاحقًا.</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-4 break-all">{error}</p>
              </div>
          </div>
      );
  }

  if (!user) {
    return <Login />;
  }

  if (user.role === Role.QueueScreen) {
    return <Queue />;
  }

  return (
    <DashboardLayout>
      {renderView()}
    </DashboardLayout>
  );
};

export default App;