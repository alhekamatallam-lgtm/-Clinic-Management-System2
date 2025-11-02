import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PaymentVoucher, PaymentVoucherStatus, Role } from '../types';
import { ChevronRightIcon, ChevronLeftIcon, CheckBadgeIcon, ClockIcon, XCircleIcon } from '@heroicons/react/24/solid';

const PaymentVouchers: React.FC = () => {
    const { user, paymentVouchers, updatePaymentVoucherStatus } = useApp();

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

    const handleApproveVoucher = (voucher: PaymentVoucher) => {
        if (window.confirm('هل أنت متأكد من اعتماد سند الصرف هذا؟')) {
            updatePaymentVoucherStatus(voucher, PaymentVoucherStatus.Approved);
        }
    };

    const handleRejectVoucher = (voucher: PaymentVoucher) => {
        if (window.confirm('هل أنت متأكد من رفض سند الصرف هذا؟')) {
            updatePaymentVoucherStatus(voucher, PaymentVoucherStatus.Rejected);
        }
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

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة سندات الصرف</h1>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم السند</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الطلب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">طريقة الصرف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentVouchers.map(item => (
                            <tr key={item.voucher_id + '-' + item.request_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.voucher_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.request_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{item.amount.toFixed(2)} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.beneficiary}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{item.payment_method}</td>
                                <td className="p-3 text-sm">{getStatusChip(item.status)}</td>
                                <td className="p-3 text-sm">
                                    {user?.role === Role.Manager && item.status === PaymentVoucherStatus.Pending && (
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleApproveVoucher(item)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600 flex items-center">
                                                <CheckBadgeIcon className="h-4 w-4 ml-1" /> اعتماد
                                            </button>
                                            <button onClick={() => handleRejectVoucher(item)} className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 flex items-center">
                                                <XCircleIcon className="h-4 w-4 ml-1" /> رفض
                                            </button>
                                        </div>
                                    )}
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