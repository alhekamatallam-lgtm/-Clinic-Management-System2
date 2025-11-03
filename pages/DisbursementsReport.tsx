import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { DisbursementStatus, DisbursementType } from '../types';

const DisbursementsReport: React.FC = () => {
    const { disbursements, clinicLogo } = useApp();
    
    const [isPrinting, setIsPrinting] = useState(false);
    const [beneficiaryFilter, setBeneficiaryFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (isPrinting) {
            const handleAfterPrint = () => setIsPrinting(false);
            window.addEventListener('afterprint', handleAfterPrint);
            window.print();
            return () => window.removeEventListener('afterprint', handleAfterPrint);
        }
    }, [isPrinting]);
    
    const filteredDisbursements = useMemo(() => {
        let tempDisbursements = [...disbursements];

        if (beneficiaryFilter) {
            tempDisbursements = tempDisbursements.filter(d => 
                d.beneficiary.toLowerCase().includes(beneficiaryFilter.toLowerCase())
            );
        }
        if (typeFilter !== 'all') {
            tempDisbursements = tempDisbursements.filter(d => d.disbursement_type === typeFilter);
        }
        if (statusFilter !== 'all') {
            tempDisbursements = tempDisbursements.filter(d => d.status === statusFilter);
        }
        if (startDate) {
            tempDisbursements = tempDisbursements.filter(d => d.date >= startDate);
        }
        if (endDate) {
            tempDisbursements = tempDisbursements.filter(d => d.date <= endDate);
        }
        
        return tempDisbursements.sort((a, b) => {
             const dateComparison = new Date(b.date).getTime() - new Date(a.date).getTime();
             if (dateComparison !== 0) return dateComparison;
             return b.disbursement_id - a.disbursement_id;
        });
    }, [disbursements, beneficiaryFilter, typeFilter, statusFilter, startDate, endDate]);
    
    const totalPages = Math.ceil(filteredDisbursements.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDisbursements = filteredDisbursements.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const totalFilteredAmount = useMemo(() => {
        return filteredDisbursements.reduce((sum, d) => sum + d.amount, 0);
    }, [filteredDisbursements]);

    const resetFilters = () => {
        setBeneficiaryFilter('');
        setTypeFilter('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
        setCurrentPage(1);
    };
    
    const handlePrint = () => {
        setIsPrinting(true);
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 no-print">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, filteredDisbursements.length)} من أصل {filteredDisbursements.length} سجل
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
    
    const PrintableContent = () => (
        <div className="bg-white text-black p-6">
            <div className="text-center mb-6">
                {clinicLogo && <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto mx-auto mb-4 object-contain" />}
                <h1 className="text-2xl font-bold text-black">تقرير المصروفات</h1>
                {(startDate || endDate) && <p className="text-lg text-gray-700">للفترة من {startDate || '...'} إلى {endDate || '...'}</p>}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الغرض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">النوع</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredDisbursements.map(d => (
                            <tr key={d.disbursement_id}>
                                <td className="p-3 text-sm">{d.disbursement_id}</td>
                                <td className="p-3 text-sm">{d.date}</td>
                                <td className="p-3 text-sm">{d.beneficiary}</td>
                                <td className="p-3 text-sm">{d.purpose}</td>
                                <td className="p-3 text-sm">{d.disbursement_type}</td>
                                <td className="p-3 text-sm">{d.status}</td>
                                <td className="p-3 text-sm font-bold">{d.amount.toFixed(2)} ريال</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                        <tr>
                            <td colSpan={6} className="p-3 text-sm font-bold text-left">الإجمالي</td>
                            <td className="p-3 text-sm font-bold text-teal-700 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
    
    if (isPrinting) {
        return <PrintableContent />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقرير المصروفات</h1>
                <button onClick={handlePrint} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <PrinterIcon className="h-5 w-5 ml-2" />
                    طباعة
                </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4 no-print">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>تصفية حسب:</span>
                </div>
                <input
                    type="text"
                    placeholder="ابحث باسم المستفيد..."
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={beneficiaryFilter}
                    onChange={e => setBeneficiaryFilter(e.target.value)}
                />
                <select
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                    <option value="all">كل الأنواع</option>
                    <option value={DisbursementType.Cash}>{DisbursementType.Cash}</option>
                    <option value={DisbursementType.Transfer}>{DisbursementType.Transfer}</option>
                </select>
                <select
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                    <option value="all">كل الحالات</option>
                    <option value={DisbursementStatus.Pending}>{DisbursementStatus.Pending}</option>
                    <option value={DisbursementStatus.Approved}>{DisbursementStatus.Approved}</option>
                    <option value={DisbursementStatus.Rejected}>{DisbursementStatus.Rejected}</option>
                </select>
                <input type="date" className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                <input type="date" className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                <button onClick={resetFilters} className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    <XMarkIcon className="h-4 w-4 ml-1" /> مسح
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المستفيد</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الغرض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">النوع</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentDisbursements.map(d => (
                            <tr key={d.disbursement_id}>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.disbursement_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.beneficiary}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.purpose}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.disbursement_type}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{d.status}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{d.amount.toFixed(2)} ريال</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={6} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">الإجمالي</td>
                            <td className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <PaginationControls />
        </div>
    );
};

export default DisbursementsReport;