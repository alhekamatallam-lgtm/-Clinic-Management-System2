import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Disbursement, DisbursementStatus, DisbursementType, Role, PaymentVoucherStatus, PaymentMethod } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, ChevronRightIcon, ChevronLeftIcon, CheckBadgeIcon, ClockIcon, DocumentPlusIcon, XCircleIcon, PrinterIcon, ArrowUturnLeftIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Disbursements: React.FC = () => {
    const { user, disbursements, paymentVouchers, addDisbursement, updateDisbursementStatus, addPaymentVoucher, isAdding, clinicLogo } = useApp();
    const [isRequestModalOpen, setRequestModalOpen] = useState(false);
    const [isVoucherModalOpen, setVoucherModalOpen] = useState(false);
    const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [printingRequest, setPrintingRequest] = useState<Disbursement | null>(null);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);

    useEffect(() => {
        if (printingRequest) {
            window.print();
        }
    }, [printingRequest]);

    const today = getLocalYYYYMMDD(new Date());

    const initialRequestFormState: Omit<Disbursement, 'disbursement_id' | 'status'> = {
        date: today,
        disbursement_type: DisbursementType.Cash,
        amount: 0,
        beneficiary: '',
        purpose: '',
    };
    const [requestFormData, setRequestFormData] = useState(initialRequestFormState);

    const initialVoucherFormState = {
        payment_method: PaymentMethod.Cash,
        notes: '',
    };
    const [voucherFormData, setVoucherFormData] = useState(initialVoucherFormState);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const sortedDisbursements = useMemo(() => 
        [...disbursements].sort((a, b) => {
             if (!a.date || !b.date) return 0;
             const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
             if (dateComparison !== 0) return dateComparison;
             return b.disbursement_id - a.disbursement_id;
        }),
    [disbursements]);
    
    const pendingApproval = useMemo(() => sortedDisbursements.filter(d => d.status === DisbursementStatus.Pending), [sortedDisbursements]);
    
    const pendingVoucherCreation = useMemo(() => sortedDisbursements.filter(d => d.status === DisbursementStatus.Approved && !paymentVouchers.some(v => v.request_id === d.disbursement_id)), [sortedDisbursements, paymentVouchers]);

    const pendingVoucherApproval = useMemo(() => sortedDisbursements.filter(d => {
        const voucher = paymentVouchers.find(v => v.request_id === d.disbursement_id);
        return d.status === DisbursementStatus.Approved && voucher && voucher.status === PaymentVoucherStatus.Pending;
    }), [sortedDisbursements, paymentVouchers]);

    const archiveDisbursements = useMemo(() => sortedDisbursements.filter(d => {
        if (d.status === DisbursementStatus.Pending) return false; // Handled by pendingApproval
        if (d.status === DisbursementStatus.Approved) {
            const voucher = paymentVouchers.find(v => v.request_id === d.disbursement_id);
            if (!voucher) return false; // Handled by pendingVoucherCreation
            if (voucher.status === PaymentVoucherStatus.Pending) return false; // Handled by pendingVoucherApproval
        }
        return true; // Is Rejected, or has an Approved/Rejected voucher.
    }), [sortedDisbursements, paymentVouchers]);
    
    // Pagination for archive
    const totalPages = Math.ceil(archiveDisbursements.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentArchivedDisbursements = archiveDisbursements.slice(indexOfFirstItem, indexOfLastItem);
    
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
        setVoucherFormData(initialVoucherFormState);
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
            request_id: selectedDisbursement.disbursement_id,
            date: today,
            disbursement_type: selectedDisbursement.disbursement_type,
            amount: selectedDisbursement.amount,
            beneficiary: selectedDisbursement.beneficiary,
            purpose: selectedDisbursement.purpose,
            payment_method: voucherFormData.payment_method,
            notes: voucherFormData.notes,
        });
        handleCloseModals();
    };
    
    const handleApproveRequest = async (disbursement: Disbursement) => {
        if (window.confirm('هل أنت متأكد من اعتماد طلب الصرف هذا؟')) {
            setUpdatingId(disbursement.disbursement_id);
            await updateDisbursementStatus(disbursement, DisbursementStatus.Approved);
            setUpdatingId(null);
        }
    };

    const handleRejectRequest = async (disbursement: Disbursement) => {
        if (window.confirm('هل أنت متأكد من رفض طلب الصرف هذا؟')) {
            setUpdatingId(disbursement.disbursement_id);
            await updateDisbursementStatus(disbursement, DisbursementStatus.Rejected);
            setUpdatingId(null);
        }
    };
    
    const handlePrintRequest = (request: Disbursement) => {
        setPrintingRequest(request);
    };
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, archiveDisbursements.length)} من أصل {archiveDisbursements.length} سجل
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

    const ActionSpinner: React.FC = () => (
        <div className="flex items-center justify-center text-sm text-gray-500">
            <svg className="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            جاري...
        </div>
    );
    
    const PrintableDisbursementRequest: React.FC<{ request: Disbursement; onBack: () => void; }> = ({ request, onBack }) => (
        <div className="printable-area bg-white text-black p-8">
            <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">مستوصف الراجحي التكافلي</h1>
                    <p className="text-md text-gray-600">Al Rajhi Takaful Polyclinic</p>
                </div>
                 {clinicLogo && <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto object-contain" />}
            </header>
            <h2 className="text-center text-xl font-bold mb-6 underline">طلب صرف</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-md">
                <p><strong>رقم الطلب:</strong> {request.disbursement_id}</p>
                <p><strong>التاريخ:</strong> {request.date}</p>
                <p><strong>المستفيد:</strong> {request.beneficiary}</p>
                <p><strong>نوع الصرف:</strong> {request.disbursement_type}</p>
                <p className="col-span-2"><strong>المبلغ:</strong> {request.amount.toFixed(2)} ريال</p>
                <p className="col-span-2"><strong>الغرض من الصرف:</strong> {request.purpose}</p>
            </div>
            <footer className="pt-24">
                <div className="flex justify-around items-end">
                    <div className="text-center w-1/2">
                        <p className="font-bold mb-12">صاحب الطلب</p>
                        <p className="border-t-2 border-dotted border-gray-400 w-48 mx-auto"></p>
                    </div>
                    <div className="text-center w-1/2">
                        <p className="font-bold mb-12">المدير</p>
                        <p className="border-t-2 border-dotted border-gray-400 w-48 mx-auto"></p>
                    </div>
                </div>
            </footer>
            <div className="no-print mt-8 text-center">
                <button onClick={onBack} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center mx-auto">
                    <ArrowUturnLeftIcon className="h-5 w-5 ml-2" />
                    عودة
                </button>
            </div>
        </div>
    );
    
    const renderTableSection = (title: string, data: Disbursement[], actions?: { type: 'approval' | 'voucher' }) => (
        <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-600 dark:text-gray-400 mb-2">{title} ({data.length})</h2>
            <div className="overflow-x-auto border rounded-lg dark:border-gray-700">
                <table className="w-full text-right">
                     <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map(item => (
                            <tr key={item.disbursement_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.disbursement_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{item.amount.toFixed(2)} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.beneficiary}</td>
                                <td className="p-3 text-sm">
                                    <div className="flex items-center gap-2">
                                        {updatingId === item.disbursement_id ? <ActionSpinner /> : (
                                            <>
                                                {actions?.type === 'approval' && user?.role === Role.Manager && (
                                                    <>
                                                        <button onClick={() => handleApproveRequest(item)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center">
                                                            <CheckBadgeIcon className="h-4 w-4 ml-1" /> اعتماد
                                                        </button>
                                                        <button onClick={() => handleRejectRequest(item)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 flex items-center">
                                                            <XCircleIcon className="h-4 w-4 ml-1" /> رفض
                                                        </button>
                                                    </>
                                                )}
                                                {actions?.type === 'voucher' && user?.role === Role.Accountant && (
                                                    <button onClick={() => handleOpenVoucherModal(item)} className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600 flex items-center">
                                                        <DocumentPlusIcon className="h-4 w-4 ml-1" /> إنشاء سند
                                                    </button>
                                                )}
                                                <button onClick={() => handlePrintRequest(item)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full dark:hover:bg-gray-600" title="طباعة الطلب">
                                                    <PrinterIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    if (printingRequest) {
        return <PrintableDisbursementRequest request={printingRequest} onBack={() => setPrintingRequest(null)} />;
    }

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
            
            {pendingApproval.length > 0 && renderTableSection('طلبات بانتظار الاعتماد', pendingApproval, { type: 'approval' })}
            {pendingVoucherCreation.length > 0 && renderTableSection('طلبات بانتظار إنشاء سند', pendingVoucherCreation, { type: 'voucher' })}
            {pendingVoucherApproval.length > 0 && renderTableSection('طلبات بانتظار اعتماد السند', pendingVoucherApproval)}
            
            {archiveDisbursements.length > 0 && (
                <div className="mt-8">
                    <button 
                        onClick={() => setIsArchiveOpen(!isArchiveOpen)}
                        className="w-full flex justify-between items-center text-left text-lg font-bold text-gray-600 dark:text-gray-400 mb-2 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <span>الأرشيف ({archiveDisbursements.length})</span>
                        <ChevronDownIcon className={`h-6 w-6 transition-transform ${isArchiveOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isArchiveOpen && (
                        <div className="space-y-2">
                             {currentArchivedDisbursements.map(item => {
                                 const voucher = paymentVouchers.find(v => v.request_id === item.disbursement_id);
                                 let statusText: string;
                                 let statusColor: 'red' | 'green';
                                 
                                 if (item.status === DisbursementStatus.Rejected) {
                                     statusText = 'الطلب مرفوض';
                                     statusColor = 'red';
                                 } else if (voucher) {
                                     if (voucher.status === PaymentVoucherStatus.Approved) {
                                         statusText = 'مكتمل';
                                         statusColor = 'green';
                                     } else { // Voucher is Rejected
                                         statusText = 'السند مرفوض';
                                         statusColor = 'red';
                                     }
                                 } else {
                                     // This state shouldn't appear in archive anymore, but as a fallback
                                     statusText = 'حالة غير معروفة';
                                     statusColor = 'red';
                                 }

                                 return (
                                    <div key={item.disbursement_id} className="p-3 border rounded-lg flex justify-between items-center dark:border-gray-700">
                                        <div>
                                            <p>#{item.disbursement_id} - {item.beneficiary} - <span className="font-bold">{item.amount.toFixed(2)} ريال</span></p>
                                            <p className="text-xs text-gray-500">{item.purpose}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                             {getStatusChip(statusText, statusColor)}
                                             <button onClick={() => handlePrintRequest(item)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full dark:hover:bg-gray-600" title="طباعة الطلب">
                                                <PrinterIcon className="h-5 w-5" />
                                            </button>
                                        </div>
                                    </div>
                                 )
                             })}
                             <PaginationControls />
                        </div>
                    )}
                </div>
            )}

            <Modal title="إضافة طلب صرف جديد" isOpen={isRequestModalOpen} onClose={handleCloseModals}>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="date" name="date" value={requestFormData.date} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        <select name="disbursement_type" value={requestFormData.disbursement_type} onChange={handleRequestChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                            <option value={DisbursementType.Cash}>نقدي</option>
                            <option value={DisbursementType.Transfer}>تحويل</option>
                        </select>
                        <div className="md:col-span-2"><input type="number" name="amount" value={requestFormData.amount || ''} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" step="any" placeholder="المبلغ" /></div>
                        <div className="md:col-span-2"><input type="text" name="beneficiary" value={requestFormData.beneficiary} onChange={handleRequestChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required placeholder="المستفيد" /></div>
                        <div className="md:col-span-2"><textarea name="purpose" value={requestFormData.purpose} onChange={handleRequestChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required placeholder="الغرض من الصرف" /></div>
                    </div>
                    <button type="submit" className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإضافة...' : 'إضافة الطلب'}</button>
                </form>
            </Modal>
            
            <Modal title={`إضافة سند صرف للطلب رقم ${selectedDisbursement?.disbursement_id}`} isOpen={isVoucherModalOpen} onClose={handleCloseModals}>
                 <form onSubmit={handleVoucherSubmit} className="space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg space-y-2">
                        <p><strong>المستفيد:</strong> {selectedDisbursement?.beneficiary}</p>
                        <p><strong>المبلغ:</strong> {selectedDisbursement?.amount.toFixed(2)} ريال</p>
                        <p><strong>الغرض:</strong> {selectedDisbursement?.purpose}</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">طريقة الصرف</label>
                        <select name="payment_method" value={voucherFormData.payment_method} onChange={handleVoucherChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                            <option value={PaymentMethod.Cash}>نقدي</option>
                            <option value={PaymentMethod.BankTransfer}>تحويل بنكي</option>
                            <option value={PaymentMethod.Cheque}>شيك</option>
                        </select>
                     </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                        <textarea name="notes" value={voucherFormData.notes} onChange={handleVoucherChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="أضف ملاحظات (اختياري)..." />
                     </div>
                     <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإنشاء...' : 'إنشاء سند الصرف'}</button>
                 </form>
            </Modal>

        </div>
    );
};

export default Disbursements;