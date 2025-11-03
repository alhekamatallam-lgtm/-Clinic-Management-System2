import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Disbursement, DisbursementStatus, DisbursementType, Role } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, CheckCircleIcon, XCircleIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const translateDisbursementStatus = (status: DisbursementStatus) => {
    switch (status) {
        case DisbursementStatus.Pending: return 'بانتظار الاعتماد';
        case DisbursementStatus.Approved: return 'معتمد';
        case DisbursementStatus.Rejected: return 'مرفوض';
        default: return status;
    }
};

const getStatusColor = (status: DisbursementStatus) => {
    switch (status) {
        case DisbursementStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case DisbursementStatus.Approved: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case DisbursementStatus.Rejected: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const Disbursements: React.FC = () => {
    const { user, disbursements, addDisbursement, updateDisbursementStatus, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const initialFormState: Omit<Disbursement, 'disbursement_id' | 'status'> = {
        date: getLocalYYYYMMDD(new Date()),
        disbursement_type: DisbursementType.Cash,
        amount: 0,
        beneficiary: '',
        purpose: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const sortedDisbursements = useMemo(() => 
        [...disbursements].sort((a, b) => b.disbursement_id - a.disbursement_id), 
        [disbursements]
    );

    const totalPages = Math.ceil(sortedDisbursements.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDisbursements = sortedDisbursements.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleOpenModal = () => {
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDisbursement(formData);
        handleCloseModal();
    };

    const handleStatusUpdate = (disbursement: Disbursement, status: DisbursementStatus) => {
        const actionText = status === DisbursementStatus.Approved ? 'اعتماد' : 'رفض';
        if (window.confirm(`هل أنت متأكد من ${actionText} طلب الصرف رقم ${disbursement.disbursement_id}؟`)) {
            updateDisbursementStatus(disbursement, status);
        }
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, sortedDisbursements.length)} من {sortedDisbursements.length} سجل
                </span>
                <div className="flex items-center gap-2">
                    <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                        <ChevronRightIcon className="w-4 h-4" />
                        <span>السابق</span>
                    </button>
                    <span className="text-sm text-gray-700 dark:text-gray-400">صفحة {currentPage} من {totalPages}</span>
                    <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                        <span>التالي</span>
                        <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">طلبات الصرف</h1>
                <button onClick={handleOpenModal} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                    <PlusIcon className="h-5 w-5 ml-2"/>
                    إضافة طلب صرف
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الطلب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الغرض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            {user?.role === Role.Manager && <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentDisbursements.map(d => (
                            <tr key={d.disbursement_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.disbursement_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.beneficiary}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.purpose}</td>
                                <td className="p-3 text-sm">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(d.status)}`}>
                                        {translateDisbursementStatus(d.status)}
                                    </span>
                                </td>
                                {user?.role === Role.Manager && (
                                    <td className="p-3">
                                        {d.status === DisbursementStatus.Pending && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleStatusUpdate(d, DisbursementStatus.Approved)} className="p-2 text-green-600 hover:bg-green-100 rounded-full dark:hover:bg-green-900" title="اعتماد">
                                                    <CheckCircleIcon className="h-5 w-5" />
                                                </button>
                                                <button onClick={() => handleStatusUpdate(d, DisbursementStatus.Rejected)} className="p-2 text-red-600 hover:bg-red-100 rounded-full dark:hover:bg-red-900" title="رفض">
                                                    <XCircleIcon className="h-5 w-5" />
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationControls />

            <Modal title="إضافة طلب صرف جديد" isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="text" name="beneficiary" placeholder="المستفيد" value={formData.beneficiary} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="number" name="amount" placeholder="المبلغ" value={String(formData.amount)} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" />
                    <select name="disbursement_type" value={formData.disbursement_type} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white">
                        <option value={DisbursementType.Cash}>نقدي</option>
                        <option value={DisbursementType.Transfer}>تحويل</option>
                    </select>
                    <textarea name="purpose" placeholder="الغرض من الصرف" value={formData.purpose} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600 disabled:bg-gray-400" disabled={isAdding}>
                        {isAdding ? 'جاري الإضافة...' : 'إضافة الطلب'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Disbursements;
