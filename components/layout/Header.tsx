import React from 'react';
import { useApp } from '../../contexts/AppContext';
import { ArrowRightOnRectangleIcon, UserCircleIcon, ArrowPathIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { Role } from '../../types';

const Header: React.FC = () => {
  const { user, logout, isSyncing, toggleSidebar, clinicLogo } = useApp();
  
  const getRoleName = (role: Role) => {
    switch(role) {
        case Role.Manager: return 'مدير';
        case Role.Doctor: return 'طبيب';
        case Role.Reception: return 'موظف استقبال';
        case Role.Accountant: return 'محاسب';
        default: return 'مستخدم';
    }
  }

  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b-2 border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700 no-print">
        <div className="flex items-center">
            <button
                onClick={toggleSidebar}
                className="p-2 mr-2 text-gray-500 rounded-md hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-teal-500"
                aria-label="Toggle sidebar"
            >
                <Bars3Icon className="h-6 w-6" />
            </button>
            {clinicLogo && (
                <img src={clinicLogo} alt="شعار المستوصف" className="h-10 w-auto mr-4 object-contain" />
            )}
            <h1 className="text-xl font-semibold text-teal-800 dark:text-teal-300 hidden sm:block">مرحباً, {user?.Name || user?.username}</h1>
            {isSyncing && (
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mr-4" title="جاري مزامنة البيانات...">
                    <ArrowPathIcon className="h-4 w-4 animate-spin text-teal-500" />
                    <span className="mr-2">جاري المزامنة...</span>
                </div>
            )}
        </div>
      <div className="flex items-center">
        <div className="text-right ml-4">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.Name || user?.username}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{getRoleName(user!.role)}</p>
        </div>
        <UserCircleIcon className="h-10 w-10 text-gray-500 dark:text-gray-400" />
        <button
          onClick={logout}
          className="mr-6 flex items-center text-gray-500 hover:text-red-600 focus:outline-none transition-colors dark:text-gray-400 dark:hover:text-red-500"
          title="تسجيل الخروج"
        >
          <ArrowRightOnRectangleIcon className="h-6 w-6" />
          <span className="mr-2 hidden md:block">خروج</span>
        </button>
      </div>
    </header>
  );
};

export default Header;