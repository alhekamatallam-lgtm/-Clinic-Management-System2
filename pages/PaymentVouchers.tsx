import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PaymentVoucher, PaymentVoucherStatus, Role } from '../types';
import { ChevronRightIcon, ChevronLeftIcon, CheckBadgeIcon, ClockIcon, XCircleIcon, PrinterIcon, ArrowUturnLeftIcon } from '@heroicons/react/24/solid';

const PaymentVouchers: React.FC = () => {
    const { user, paymentVouchers, updatePaymentVoucherStatus, clinicLogo } = useApp();
    
    const [updatingId, setUpdatingId] = useState<number | null>(null);
    const [printingVoucher, setPrintingVoucher] = useState<PaymentVoucher | null>(null);


    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    const sortedVouchers = useMemo(() => 
        [...paymentVouchers].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [paymentVouchers]);
    
    // Pagination calculations
    const totalPages = Math.ceil(sortedVouchers.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVouchers = sortedVouchers.slice(indexOfFirstItem, indexOfLastItem);
    
    const totalAmount = useMemo(() => 
        currentVouchers.reduce((sum, item) => sum + item.amount, 0),
    [currentVouchers]);
    
    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleApproveVoucher = async (voucher: PaymentVoucher) => {
        if (window.confirm('هل أنت متأكد من اعتماد سند الصرف هذا؟')) {
            setUpdatingId(voucher.request_id);
            await updatePaymentVoucherStatus(voucher, PaymentVoucherStatus.Approved);
            setUpdatingId(null);
        }
    };

    const handleRejectVoucher = async (voucher: PaymentVoucher) => {
        if (window.confirm('هل أنت متأكد من رفض سند الصرف هذا؟')) {
            setUpdatingId(voucher.request_id);
            await updatePaymentVoucherStatus(voucher, PaymentVoucherStatus.Rejected);
            setUpdatingId(null);
        }
    };
    
    const handlePrintVoucher = (voucher: PaymentVoucher) => {
        setPrintingVoucher(voucher);
        setTimeout(() => window.print(), 100);
    };
    
    const getStatusChip = (status: PaymentVoucherStatus) => {
        switch (status) {
            case PaymentVoucherStatus.Pending:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                        <ClockIcon className="h-4 w-4 ml-1 text-yellow-500" />
                        بانتظار الاعتماد
                    </span>
                );
            case PaymentVoucherStatus.Approved:
                return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                        <CheckBadgeIcon className="h-4 w-4 ml-1 text-green-500" />
                        معتمد
                    </span>
                );
            case PaymentVoucherStatus.Rejected:
                 return (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                        <XCircleIcon className="h-4 w-4 ml-1 text-red-500" />
                        مرفوض
                    </span>
                );
            default:
                return null;
        }
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
    
    const PrintablePaymentVoucher: React.FC<{ voucher: PaymentVoucher; onBack: () => void; }> = ({ voucher, onBack }) => (
        <div className="printable-area bg-white text-black p-8">
            <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">مستوصف الراجحي التكافلي</h1>
                    <p className="text-md text-gray-600">Al Rajhi Takaful Polyclinic</p>
                </div>
                 {clinicLogo && <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto object-contain" />}
            </header>
            <h2 className="text-center text-xl font-bold mb-6 underline">سند صرف</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-md">
                <p><strong>رقم السند:</strong> {voucher.voucher_id}</p>
                <p><strong>تاريخ السند:</strong> {voucher.date}</p>
                 <p><strong>بناءً على طلب رقم:</strong> {voucher.request_id}</p>
                <p><strong>المستفيد:</strong> {voucher.beneficiary}</p>
                <p className="col-span-2"><strong>المبلغ:</strong> {voucher.amount.toFixed(2)} ريال</p>
                <p className="col-span-2"><strong>مقابل / الغرض من الصرف:</strong> {voucher.purpose}</p>
                <p><strong>طريقة الصرف:</strong> {voucher.payment_method}</p>
                <p><strong>نوع الصرف:</strong> {voucher.disbursement_type}</p>
                {voucher.notes && <p className="col-span-2"><strong>ملاحظات المحاسب:</strong> {voucher.notes}</p>}
            </div>
            <footer className="pt-24">
                <div className="flex justify-around items-end">
                    <div className="text-center w-1/2">
                        <p className="font-bold mb-12">المحاسب</p>
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
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, sortedVouchers.length)} من أصل {sortedVouchers.length} سجل
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

    if (printingVoucher) {
        return <PrintablePaymentVoucher voucher={printingVoucher} onBack={() => setPrintingVoucher(null)} />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة سندات الصرف</h1>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300"># السند</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300"># الطلب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">ملاحظات</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentVouchers.map(item => (
                            <tr key={item.voucher_id + '-' + item.request_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.voucher_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.request_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.beneficiary}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{item.amount.toFixed(2)} ريال</td>
                                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{item.notes || '-'}</td>
                                <td className="p-3 text-sm">{getStatusChip(item.status)}</td>
                                <td className="p-3 text-sm">
                                    <div className="flex items-center gap-2">
                                         {updatingId === item.request_id ? <ActionSpinner /> : (
                                            <>
                                                {user?.role === Role.Manager && item.status === PaymentVoucherStatus.Pending && (
                                                    <>
                                                        <button onClick={() => handleApproveVoucher(item)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center">
                                                            <CheckBadgeIcon className="h-4 w-4 ml-1" /> اعتماد
                                                        </button>
                                                        <button onClick={() => handleRejectVoucher(item)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 flex items-center">
                                                            <XCircleIcon className="h-4 w-4 ml-1" /> رفض
                                                        </button>
                                                    </>
                                                )}
                                                <button onClick={() => handlePrintVoucher(item)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full dark:hover:bg-gray-600" title="طباعة السند">
                                                    <PrinterIcon className="h-5 w-5" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={3} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">إجمالي الصفحة الحالية</td>
                            <td colSpan={5} className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400 text-right">{totalAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <PaginationControls />

        </div>
    );
};

export default PaymentVouchers;