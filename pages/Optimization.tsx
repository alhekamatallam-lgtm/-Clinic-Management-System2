import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import Modal from '../components/ui/Modal';
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const Optimization: React.FC = () => {
    const { user, optimizations, addOptimization, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [suggestionText, setSuggestionText] = useState('');
    const [selectedPage, setSelectedPage] = useState('general');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // Pagination calculations
    const totalPages = Math.ceil(optimizations.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentOptimizations = optimizations.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const pageOptions = [
        { value: 'dashboard', label: 'لوحة التحكم' },
        { value: 'queue', label: 'شاشة الانتظار' },
        { value: 'patients', label: 'المرضى' },
        { value: 'visits', label: 'الزيارات' },
        { value: 'revenues', label: 'الإيرادات' },
        { value: 'diagnosis', label: 'التشخيص' },
        { value: 'reports', label: 'التقارير' },
        { value: 'users', label: 'المستخدمين' },
        { value: 'clinics', label: 'العيادات' },
        { value: 'doctors', label: 'الأطباء' },
        { value: 'settings', label: 'الإعدادات' },
        { value: 'documentation', label: 'الوثائق' },
        { value: 'general', label: 'عام / أخرى' },
    ];

    const handleOpenModal = () => {
        setSuggestionText('');
        setSelectedPage('general');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !suggestionText.trim()) return;

        await addOptimization({
            user: user.username,
            name: user.Name,
            page: selectedPage,
            optimize: suggestionText
        });
        
        handleCloseModal();
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, optimizations.length)} من أصل {optimizations.length} سجل
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                        <ChevronRightIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">السابق</span>
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-400">صفحة {currentPage} من {totalPages}</span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                        <span className="hidden sm:inline">التالي</span>
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">سجل التحسينات والاقتراحات</h1>
                <button
                    onClick={handleOpenModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة اقتراح جديد
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المستخدم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الصفحة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاقتراح / المشكلة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentOptimizations.map(opt => (
                            <tr key={opt.optimization_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{opt.name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{pageOptions.find(p => p.value === opt.page)?.label || opt.page}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{opt.optimize}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            <PaginationControls />

            <Modal title="إضافة اقتراح جديد" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="suggestion-page" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            متعلق بصفحة
                        </label>
                        <select
                            id="suggestion-page"
                            value={selectedPage}
                            onChange={(e) => setSelectedPage(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                            {pageOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="suggestion-text" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            الاقتراح / المشكلة
                        </label>
                        <textarea
                            id="suggestion-text"
                            value={suggestionText}
                            onChange={(e) => setSuggestionText(e.target.value)}
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
                        {isAdding ? 'جاري الإرسال...' : 'إرسال الاقتراح'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Optimization;