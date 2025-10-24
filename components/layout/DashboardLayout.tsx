import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { useApp } from '../../contexts/AppContext';
import FeedbackButton from '../ui/FeedbackButton';
import AiAssistant from '../ui/AiAssistant';
import { CheckCircleIcon, XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid';

// Notification component defined within DashboardLayout to avoid creating new files.
const Notification: React.FC = () => {
    const { notification, hideNotification } = useApp();
  
    if (!notification) return null;
  
    const isSuccess = notification.type === 'success';
  
    return (
      <div 
        className={`fixed top-5 left-5 z-[100] p-4 rounded-lg shadow-lg flex items-center text-white transition-all duration-300 ${isSuccess ? 'bg-teal-500' : 'bg-red-500'}`}
        style={{ direction: 'rtl' }}
      >
        {isSuccess ? <CheckCircleIcon className="h-6 w-6 ml-2" /> : <XCircleIcon className="h-6 w-6 ml-2" />}
        <span className="flex-grow">{notification.message}</span>
         <button onClick={hideNotification} className="mr-2 p-1 rounded-full hover:bg-black/20">
            <XMarkIcon className="h-5 w-5"/>
        </button>
      </div>
    );
  };


interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
    const { isSidebarOpen, toggleSidebar } = useApp();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900" dir="rtl">
      <Sidebar />
      <div className="flex-1 flex flex-col transition-all duration-300 ease-in-out">
        <Header />
        <main className={`flex-1 p-4 sm:p-6 overflow-y-auto`}>
            {isSidebarOpen && <div onClick={toggleSidebar} className="fixed inset-0 bg-black/30 z-20 lg:hidden" aria-hidden="true"></div>}
            {children}
        </main>
      </div>
      <Notification />
      <FeedbackButton />
      <AiAssistant />
    </div>
  );
};

export default DashboardLayout;