import React, { useState } from 'react';
import { useApp } from '../../contexts/AppContext';
import Modal from './Modal';
import { LightBulbIcon } from '@heroicons/react/24/solid';
import { View } from '../../types';

// Mapping from view ID to Arabic name for display
const viewNames: { [key in View]?: string } = {
    dashboard: 'لوحة التحكم',
    queue: 'شاشة الانتظار',
    patients: 'المرضى',
    visits: 'الزيارات',
    revenues: 'الإيرادات',
    diagnosis: 'التشخيص',
    reports: 'تقارير الإيرادات',
    'daily-clinic-report': 'التقرير اليومي للعيادات',
    'medical-report': 'التقارير الطبية',
    users: 'المستخدمين',
    clinics: 'العيادات',
    doctors: 'الأطباء',
    settings: 'الإعدادات',
    documentation: 'الوثائق',
    optimization: 'تحسينات واقتراحات',
    'manual-revenue': 'إيراد يدوي'
};


const FeedbackButton: React.FC = () => {
    const { user, currentView, addOptimization, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [feedbackText, setFeedbackText] = useState('');

    const handleOpenModal = () => {
        setFeedbackText('');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !feedbackText.trim()) return;

        await addOptimization({
            user: user.username,
            name: user.Name,
            page: currentView,
            optimize: feedbackText
        });
        
        handleCloseModal();
    };

    const currentPageName = viewNames[currentView] || currentView;

    return (
        <>
            <button
                onClick={handleOpenModal}
                className="no-print fixed bottom-6 left-24 z-40 bg-amber-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-amber-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                title="إرسال اقتراح أو ملاحظة"
            >
                <LightBulbIcon className="h-7 w-7" />
            </button>

            <Modal title="إرسال اقتراح أو ملاحظة" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسمك</label>
                        <input
                            type="text"
                            value={user?.Name || ''}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                            readOnly
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الصفحة الحالية</label>
                        <input
                            type="text"
                            value={currentPageName}
                            className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500"
                            readOnly
                        />
                    </div>
                    <div>
                        <label htmlFor="feedback-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اقتراحك أو المشكلة</label>
                        <textarea
                            id="feedback-text"
                            value={feedbackText}
                            onChange={(e) => setFeedbackText(e.target.value)}
                            rows={5}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            placeholder="يرجى وصف الاقتراح أو المشكلة بالتفصيل..."
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الإرسال...' : 'إرسال'}
                    </button>
                </form>
            </Modal>
        </>
    );
};

export default FeedbackButton;