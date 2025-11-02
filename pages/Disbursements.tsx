import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Disbursement, DisbursementStatus, DisbursementType, Role, PaymentVoucher, PaymentVoucherStatus, PaymentMethod } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon, CheckBadgeIcon, ClockIcon, DocumentPlusIcon, XCircleIcon } from '@heroicons/react/24/solid';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Disbursements: React.FC = () => {
    const { user, disbursements, paymentVouchers, addDisbursement, updateDisbursementStatus, addPaymentVoucher, updatePaymentVoucherStatus, isAdding } = useApp();
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [isVoucherModalOpen, setVoucherModalOpen] = useState(false);
    const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);

    const today = getLocalYYYYMMDD(new Date());

    const initialRequestFormState: Omit<Disbursement, 'disbursement_id' | 'status'> = {
        date: today,
        disbursement_type: DisbursementType.Cash,
        amount: 0,
        beneficiary: '',
        purpose: '',
    };
    const [requestFormData, setRequestFormData] = useState(initialRequestFormState);

    const initialVoucherFormState: Omit<PaymentVoucher, 'voucher_id' | 'status' | 'request_id'> = {
        date: today,
        disbursement_type: DisbursementType.Cash,
        amount: 0,
        beneficiary: '',
        purpose: '',
        payment_method: PaymentMethod.Cash,
    };
    const [voucherFormData, setVoucherFormData] = useState(initialVoucherFormState);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const sortedDisbursements = useMemo(() => 
        [...disbursements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [disbursements]);
    
    // Pagination calculations
    const totalPages = Math.ceil(sortedDisbursements.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDisbursements = sortedDisbursements.slice(indexOfFirstItem, indexOfLastItem);
    
    const totalAmount = useMemo(() => 
        currentDisbursements.reduce((sum, item) => sum + item.amount, 0),
    [currentDisbursements]);
    
    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleOpenRequestModal = () => {
        setRequestFormData(initialRequestFormState);
        setRequestModalOpen(true);
    };

    const handleOpenVoucherModal = (disbursement: Disbursement) => {
        setSelectedDisbursement(disbursement);
        setVoucherFormData({
            date: today,
            disbursement_type: disbursement.disbursement_type,
            amount: disbursement.amount,
            beneficiary: disbursement.beneficiary,
            purpose: disbursement.purpose,
            payment_method: PaymentMethod.Cash
        });
        setVoucherModalOpen(true);
    };

    const handleCloseModals = () => {
        setRequestModalOpen(false);
        setVoucherModalOpen(false);
        setSelectedDisbursement(null);
    };
    
    const handleRequestChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setRequestFormData(prev => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
    };

    const handleVoucherChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setVoucherFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleRequestSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDisbursement(requestFormData);
        handleCloseModals();
    };

    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDisbursement) return;
        await addPaymentVoucher({
            ...voucherFormData,
            request_id: selectedDisbursement.disbursement_id
        });
        handleCloseModals();
    };
    
    const handleApproveRequest = (disbursementId: number) => {
        if (window.confirm('هل أنت متأكد من اعتماد طلب الصرف هذا؟')) {
            updateDisbursementStatus(disbursementId, DisbursementStatus.Approved);
        }
    };

    const handleRejectRequest = (disbursementId: number) => {
        if (window.confirm('هل أنت متأكد من رفض طلب الصرف هذا؟')) {
            updateDisbursementStatus(disbursementId, DisbursementStatus.Rejected);
        }
    };

    const handleApproveVoucher = (voucherId: number) => {
        if (window.confirm('هل أنت متأكد من اعتماد سند الصرف هذا؟')) {
            updatePaymentVoucherStatus(voucherId, PaymentVoucherStatus.Approved);
        }
    };

    const handleRejectVoucher = (voucherId: number) => {
        if (window.confirm('هل أنت متأكد من رفض سند الصرف هذا؟')) {
            updatePaymentVoucherStatus(voucherId, PaymentVoucherStatus.Rejected);
        }
    };
    
    // FIX: Replaced JSX.Element with React.ReactNode to resolve "Cannot find namespace 'JSX'" error.
    const getOverallStatus = (disbursement: Disbursement): { text: string; chip: React.ReactNode } => {
        const voucher = paymentVouchers.find(v => v.request_id === disbursement.disbursement_id);
        
        if (voucher) {
            if (voucher.status === PaymentVoucherStatus.Approved) {
                return { text: 'مكتمل', chip: getStatusChip('مكتمل', 'green') };
            }
             if (voucher.status === PaymentVoucherStatus.Rejected) {
                return { text: 'السند مرفوض', chip: getStatusChip('السند مرفوض', 'red') };
            }
            return { text: 'بانتظار اعتماد السند', chip: getStatusChip('بانتظار اعتماد السند', 'blue') };
        }
        
        if (disbursement.status === DisbursementStatus.Approved) {
            return { text: 'بانتظار إنشاء السند', chip: getStatusChip('بانتظار إنشاء السند', 'indigo') };
        }
        
        if (disbursement.status === DisbursementStatus.Rejected) {
            return { text: 'الطلب مرفوض', chip: getStatusChip('الطلب مرفوض', 'red') };
        }
        
        return { text: 'بانتظار اعتماد الطلب', chip: getStatusChip('بانتظار اعتماد الطلب', 'yellow') };
    };

    const getStatusChip = (statusText: string, color: 'yellow' | 'green' | 'blue' | 'indigo' | 'red') => {
        const colors = {
            yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
            green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
            blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
            indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
            red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        };
        const iconColors = {
            yellow: 'text-yellow-500',
            green: 'text-green-500',
            blue: 'text-blue-500',
            indigo: 'text-indigo-500',
            red: 'text-red-500'
        };
        const Icon = color === 'green' ? CheckBadgeIcon : color === 'red' ? XCircleIcon : ClockIcon;

        return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[color]}`}>
                <Icon className={`h-4 w-4 ml-1 ${iconColors[color]}`} />
                {statusText}
            </span>
        );
    };
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, sortedDisbursements.length)} من أصل {sortedDisbursements.length} سجل
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
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة طلبات الصرف</h1>
                <button 
                    onClick={handleOpenRequestModal}
                    className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                >
                    <PlusIcon className="h-5 w-5 ml-2" />
                    إضافة طلب صرف
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الطلب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الغرض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentDisbursements.map(item => {
                            const overallStatus = getOverallStatus(item);
                            const voucher = paymentVouchers.find(v => v.request_id === item.disbursement_id);
                            return (
                                <tr key={item.disbursement_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.disbursement_id}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.date}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{item.amount.toFixed(2)} ريال</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.beneficiary}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.purpose}</td>
                                    <td className="p-3 text-sm">{overallStatus.chip}</td>
                                    <td className="p-3 text-sm">
                                        {user?.role === Role.Manager && item.status === DisbursementStatus.Pending && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleApproveRequest(item.disbursement_id)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center">
                                                    <CheckBadgeIcon className="h-4 w-4 ml-1" /> اعتماد
                                                </button>
                                                <button onClick={() => handleRejectRequest(item.disbursement_id)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 flex items-center">
                                                    <XCircleIcon className="h-4 w-4 ml-1" /> رفض
                                                </button>
                                            </div>
                                        )}
                                        {user?.role === Role.Accountant && item.status === DisbursementStatus.Approved && !voucher && (
                                            <button onClick={() => handleOpenVoucherModal(item)} className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 flex items-center">
                                                <DocumentPlusIcon className="h-4 w-4 ml-1" /> إضافة سند صرف
                                            </button>
                                        )}
                                         {user?.role === Role.Manager && voucher && voucher.status === PaymentVoucherStatus.Pending && (
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => handleApproveVoucher(voucher.voucher_id)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center">
                                                    <CheckBadgeIcon className="h-4 w-4 ml-1" /> اعتماد
                                                </button>
                                                <button onClick={() => handleRejectVoucher(voucher.voucher_id)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 flex items-center">
                                                    <XCircleIcon className="h-4 w-4 ml-1" /> رفض
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={2} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">إجمالي الصفحة الحالية</td>
                            <td colSpan={5} className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400 text-right">{totalAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <PaginationControls />

            <Modal title="إضافة طلب صرف جديد" isOpen={isRequestModalOpen} onClose={handleCloseModals}>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" name="date" value={requestFormData.date} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        <select name="disbursement_type" value={requestFormData.disbursement_type} onChange={handleRequestChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                            <option value={DisbursementType.Cash}>نقدي</option>
                            <option value={DisbursementType.Transfer}>تحويل</option>
                        </select>
                        <div className="md:col-span-2"><input type="number" name="amount" value={requestFormData.amount} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" step="any" placeholder="المبلغ" /></div>
                        <div className="md:col-span-2"><input type="text" name="beneficiary" value={requestFormData.beneficiary} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required placeholder="المستفيد" /></div>
                        <div className="md:col-span-2"><textarea name="purpose" value={requestFormData.purpose} onChange={handleRequestChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required placeholder="الغرض من الصرف" /></div>
                    </div>
                    <button type="submit" className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإضافة...' : 'إضافة الطلب'}</button>
                </form>
            </Modal>
            
            <Modal title={`إضافة سند صرف للطلب رقم ${selectedDisbursement?.disbursement_id}`} isOpen={isVoucherModalOpen} onClose={handleCloseModals}>
                 <form onSubmit={handleVoucherSubmit} className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-2">
                        <p><strong>المستفيد:</strong> {voucherFormData.beneficiary}</p>
                        <p><strong>المبلغ:</strong> {voucherFormData.amount.toFixed(2)} ريال</p>
                        <p><strong>الغرض:</strong> {voucherFormData.purpose}</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الصرف</label>
                        <select name="payment_method" value={voucherFormData.payment_method} onChange={handleVoucherChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                            <option value={PaymentMethod.Cash}>نقدي</option>
                            <option value={PaymentMethod.BankTransfer}>تحويل بنكي</option>
                            <option value={PaymentMethod.Cheque}>شيك</option>
                        </select>
                     </div>
                     <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإنشاء...' : 'إنشاء سند الصرف'}</button>
                 </form>
            </Modal>

        </div>
    );
};

export default Disbursements;