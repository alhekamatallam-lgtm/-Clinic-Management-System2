import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { PaymentVoucher, PaymentVoucherStatus, Role } from '../types';
import { CheckCircleIcon, XCircleIcon, PrinterIcon, EyeIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import Modal from '../components/ui/Modal';

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

// Printable Component
const PrintableVoucher: React.FC<{ voucher: PaymentVoucher; logo: string | null; stamp: string | null; }> = ({ voucher, logo, stamp }) => {
    return (
        <div className="p-8 bg-white text-black font-serif">
            <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">سند صرف</h1>
                    <p className="text-md text-gray-600">Payment Voucher</p>
                </div>
                {logo && <img src={logo} alt="شعار المستوصف" className="h-20 w-auto object-contain" />}
            </header>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-md">
                <p><strong>رقم السند:</strong> {voucher.voucher_id}</p>
                <p><strong>رقم الطلب:</strong> {voucher.request_id}</p>
                <p><strong>التاريخ:</strong> {voucher.date}</p>
                <p><strong>المبلغ:</strong> {voucher.amount.toLocaleString()} جنيه</p>
                <p className="col-span-2"><strong>المستفيد:</strong> {voucher.beneficiary}</p>
                <p className="col-span-2"><strong>مقابل / الغرض من الصرف:</strong> {voucher.purpose}</p>
                <p><strong>طريقة الصرف:</strong> {voucher.payment_method}</p>
                <p><strong>الحالة:</strong> {translateVoucherStatus(voucher.status)}</p>
                {voucher.notes && <p className="col-span-2"><strong>ملاحظات:</strong> {voucher.notes}</p>}
            </div>

            <footer className="pt-24 mt-16 border-t">
                <div className="flex justify-between items-end">
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-2">المحاسب</p>
                        <p className="border-b-2 border-dotted border-gray-400 w-full h-12"></p>
                    </div>
                     <div className="text-center w-1/3">
                        {stamp ? (
                             <img src={stamp} alt="ختم المستوصف" className="h-24 mx-auto object-contain" />
                        ) : (
                             <div className="h-24 w-24 border-2 border-dashed rounded-full mx-auto flex items-center justify-center text-gray-400">
                                <p className="text-xs">مكان الختم</p>
                            </div>
                        )}
                    </div>
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-2">المدير</p>
                        <p className="border-b-2 border-dotted border-gray-400 w-full h-12"></p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const PaymentVouchers: React.FC = () => {
    const { user, paymentVouchers, updatePaymentVoucherStatus, clinicLogo, clinicStamp } = useApp();
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    // Print & Preview State
    const [itemToPreview, setItemToPreview] = useState<PaymentVoucher | null>(null);
    const [itemToPrint, setItemToPrint] = useState<PaymentVoucher | null>(null);
    
    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    // Reliable Print Effect
    useEffect(() => {
        if (itemToPrint) {
            // This effect runs after the component re-renders with the printable content.
            window.print();
            // The print dialog is modal, so this line runs after it's closed.
            setItemToPrint(null);
        }
    }, [itemToPrint]);

    const sortedVouchers = useMemo(() => 
        [...paymentVouchers].sort((a, b) => {
             // Sort pending items first, then by ID descending
            if (a.status === PaymentVoucherStatus.Pending && b.status !== PaymentVoucherStatus.Pending) return -1;
            if (a.status !== PaymentVoucherStatus.Pending && b.status === PaymentVoucherStatus.Pending) return 1;
            return b.request_id - a.request_id;
        }), 
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

    const handleStatusUpdate = async (voucher: PaymentVoucher, status: PaymentVoucherStatus) => {
        setUpdatingStatus(voucher.request_id);
        await updatePaymentVoucherStatus(voucher, status);
        setUpdatingStatus(null);
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

    if (itemToPrint) {
        return (
            <div className="printable-area">
                <PrintableVoucher voucher={itemToPrint} logo={clinicLogo} stamp={clinicStamp} />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">سجل سندات الصرف</h1>
             <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            {["# السند", "# الطلب", "التاريخ", "المستفيد", "المبلغ", "طريقة الصرف", "ملاحظات", "الحالة", "إجراء"].map(h =>
                                <th key={h} className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentVouchers.map(v => (
                            <tr key={`${v.request_id}-${v.voucher_id}`} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm">{v.voucher_id}</td>
                                <td className="p-3 text-sm">{v.request_id}</td>
                                <td className="p-3 text-sm">{v.date}</td>
                                <td className="p-3 text-sm">{v.beneficiary}</td>
                                <td className="p-3 text-sm">{v.amount.toLocaleString()} جنيه</td>
                                <td className="p-3 text-sm">{v.payment_method}</td>
                                <td className="p-3 text-sm">{v.notes || '-'}</td>
                                <td className="p-3 text-sm">
                                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(v.status)}`}>
                                        {translateVoucherStatus(v.status)}
                                    </span>
                                </td>
                                <td className="p-3">
                                    <div className="flex items-center gap-1">
                                        {user?.role === Role.Manager && v.status === PaymentVoucherStatus.Pending && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(v, PaymentVoucherStatus.Approved)} disabled={updatingStatus === v.request_id} className="p-2 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50" title="اعتماد"> <CheckCircleIcon className="h-5 w-5" /> </button>
                                                <button onClick={() => handleStatusUpdate(v, PaymentVoucherStatus.Rejected)} disabled={updatingStatus === v.request_id} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50" title="رفض"> <XCircleIcon className="h-5 w-5" /> </button>
                                            </>
                                        )}
                                        <button onClick={() => setItemToPreview(v)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="معاينة"><EyeIcon className="h-5 w-5" /></button>
                                        <button onClick={() => setItemToPrint(v)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="طباعة"><PrinterIcon className="h-5 w-5" /></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <PaginationControls />
            
            {itemToPreview && (
                <Modal isOpen={!!itemToPreview} onClose={() => setItemToPreview(null)} title="معاينة سند الصرف">
                    <div className="printable-area">
                        <PrintableVoucher voucher={itemToPreview} logo={clinicLogo} stamp={clinicStamp} />
                    </div>
                    <div className="mt-4 flex justify-end gap-2 no-print">
                        <button onClick={() => setItemToPreview(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">إغلاق</button>
                        <button onClick={() => { setItemToPrint(itemToPreview); setItemToPreview(null); }} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">طباعة</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default PaymentVouchers;