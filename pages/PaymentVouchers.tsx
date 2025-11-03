import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PaymentVoucher, PaymentVoucherStatus, PaymentMethod, Disbursement, DisbursementStatus, Role } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, CheckCircleIcon, XCircleIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const translateVoucherStatus = (status: PaymentVoucherStatus) => {
    switch (status) {
        case PaymentVoucherStatus.Pending: return 'بانتظار الاعتماد';
        case PaymentVoucherStatus.Approved: return 'معتمد';
        case PaymentVoucherStatus.Rejected: return 'مرفوض';
        default: return status;
    }
};

const getStatusColor = (status: PaymentVoucherStatus) => {
    switch (status) {
        case PaymentVoucherStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case PaymentVoucherStatus.Approved: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case PaymentVoucherStatus.Rejected: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

const PaymentVouchers: React.FC = () => {
    const { user, paymentVouchers, disbursements, addPaymentVoucher, updatePaymentVoucherStatus, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const initialFormState = {
        payment_method: PaymentMethod.Cash,
        notes: '',
    };
    const [formData, setFormData] = useState(initialFormState);

    const approvedRequestsWithoutVoucher = useMemo(() => {
        const voucherRequestIds = new Set(paymentVouchers.map(v => v.request_id));
        return disbursements.filter(d => 
            d.status === DisbursementStatus.Approved && !voucherRequestIds.has(d.disbursement_id)
        );
    }, [disbursements, paymentVouchers]);

    const sortedVouchers = useMemo(() => 
        [...paymentVouchers].sort((a, b) => b.voucher_id - a.voucher_id), 
        [paymentVouchers]
    );

    const totalPages = Math.ceil(sortedVouchers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVouchers = sortedVouchers.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleOpenModal = (disbursement: Disbursement) => {
        setSelectedDisbursement(disbursement);
        setFormData(initialFormState);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedDisbursement(null);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDisbursement) return;
        await addPaymentVoucher({
            request_id: selectedDisbursement.disbursement_id,
            date: getLocalYYYYMMDD(new Date()),
            disbursement_type: selectedDisbursement.disbursement_type,
            amount: selectedDisbursement.amount,
            beneficiary: selectedDisbursement.beneficiary,
            purpose: selectedDisbursement.purpose,
            payment_method: formData.payment_method,
            notes: formData.notes,
        });
        handleCloseModal();
    };

    const handleStatusUpdate = (voucher: PaymentVoucher, status: PaymentVoucherStatus) => {
        const actionText = status === PaymentVoucherStatus.Approved ? 'اعتماد' : 'رفض';
        if (window.confirm(`هل أنت متأكد من ${actionText} سند الصرف للطلب رقم ${voucher.request_id}؟`)) {
            updatePaymentVoucherStatus(voucher, status);
        }
    };
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                 <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, sortedVouchers.length)} من {sortedVouchers.length} سجل
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
        <div className="space-y-8">
            { (user?.role === Role.Accountant || user?.role === Role.Manager) &&
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h2 className="text-xl font-bold text-teal-800 dark:text-teal-300 mb-4">طلبات صرف معتمدة (جاهزة لإنشاء سند)</h2>
                    {approvedRequestsWithoutVoucher.length > 0 ? (
                        <ul className="space-y-3">
                            {approvedRequestsWithoutVoucher.map(d => (
                                <li key={d.disbursement_id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                    <div>
                                        <p><strong>طلب رقم:</strong> {d.disbursement_id} &nbsp; <strong>لـ:</strong> {d.beneficiary}</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">{d.amount} ريال - {d.purpose}</p>
                                    </div>
                                    <button onClick={() => handleOpenModal(d)} className="flex items-center bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">
                                        <PlusIcon className="h-4 w-4 ml-1" />
                                        إنشاء سند
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400">لا توجد طلبات صرف معتمدة حالياً.</p>
                    )}
                </div>
            }

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">سجل سندات الصرف</h1>
                 <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم السند</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الطلب</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">طريقة الصرف</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                                {user?.role === Role.Manager && <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {currentVouchers.map(v => (
                                <tr key={v.voucher_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.voucher_id}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.request_id}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.date}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.beneficiary}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.amount} ريال</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{v.payment_method}</td>
                                    <td className="p-3 text-sm">
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(v.status)}`}>
                                            {translateVoucherStatus(v.status)}
                                        </span>
                                    </td>
                                    {user?.role === Role.Manager && (
                                        <td className="p-3">
                                            {v.status === PaymentVoucherStatus.Pending && (
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => handleStatusUpdate(v, PaymentVoucherStatus.Approved)} className="p-2 text-green-600 hover:bg-green-100 rounded-full dark:hover:bg-green-900" title="اعتماد">
                                                        <CheckCircleIcon className="h-5 w-5" />
                                                    </button>
                                                    <button onClick={() => handleStatusUpdate(v, PaymentVoucherStatus.Rejected)} className="p-2 text-red-600 hover:bg-red-100 rounded-full dark:hover:bg-red-900" title="رفض">
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
            </div>

            <Modal title={`إنشاء سند صرف للطلب #${selectedDisbursement?.disbursement_id}`} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p><strong>المبلغ:</strong> {selectedDisbursement?.amount} ريال</p>
                        <p><strong>المستفيد:</strong> {selectedDisbursement?.beneficiary}</p>
                        <p><strong>الغرض:</strong> {selectedDisbursement?.purpose}</p>
                    </div>
                    <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white">
                        <option value={PaymentMethod.Cash}>نقدي</option>
                        <option value={PaymentMethod.BankTransfer}>تحويل بنكي</option>
                        <option value={PaymentMethod.Cheque}>شيك</option>
                    </select>
                    <textarea name="notes" placeholder="ملاحظات (اختياري)" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600 disabled:bg-gray-400" disabled={isAdding}>
                        {isAdding ? 'جاري الإنشاء...' : 'إنشاء السند'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default PaymentVouchers;
