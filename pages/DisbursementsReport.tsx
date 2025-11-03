import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/solid';
import { Disbursement, DisbursementStatus } from '../types';

const DisbursementsReport: React.FC = () => {
    const { disbursements, clinicLogo } = useApp();
    
    // Filters
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const filteredDisbursements = useMemo(() => {
        let temp = [...disbursements];
        if (statusFilter !== 'all') {
            temp = temp.filter(d => d.status === statusFilter);
        }
        if (startDate) {
            temp = temp.filter(d => d.date >= startDate);
        }
        if (endDate) {
            temp = temp.filter(d => d.date <= endDate);
        }
        return temp.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [disbursements, statusFilter, startDate, endDate]);

    const totalAmount = useMemo(() => {
        return filteredDisbursements.reduce((sum, d) => sum + d.amount, 0);
    }, [filteredDisbursements]);

    const resetFilters = () => {
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقرير المصروفات</h1>
                <button onClick={handlePrint} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600">
                    <PrinterIcon className="h-5 w-5 ml-2"/>
                    طباعة
                </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4 no-print">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="all">كل الحالات</option>
                    {Object.values(DisbursementStatus).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                <button onClick={resetFilters} className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>
            
            <div className="printable-area">
                <header className="text-center mb-8 hidden print:block">
                    {clinicLogo && <img src={clinicLogo} alt="Logo" className="h-20 mx-auto mb-4" />}
                    <h2 className="text-3xl font-bold">تقرير المصروفات</h2>
                    <p className="text-lg text-gray-600">
                        {startDate && endDate ? `للفترة من ${startDate} إلى ${endDate}` : 'لجميع الأوقات'}
                    </p>
                </header>

                <div className="bg-teal-50 dark:bg-teal-900/50 p-4 rounded-lg mb-6 text-center">
                    <h2 className="text-lg font-semibold text-teal-800 dark:text-teal-300">إجمالي المصروفات للفترة المحددة</h2>
                    <p className="text-3xl font-bold text-teal-600 dark:text-teal-400">{totalAmount.toLocaleString()} جنيه</p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold">#</th>
                                <th className="p-3 text-sm font-semibold">التاريخ</th>
                                <th className="p-3 text-sm font-semibold">المستفيد</th>
                                <th className="p-3 text-sm font-semibold">المبلغ</th>
                                <th className="p-3 text-sm font-semibold">الغرض</th>
                                <th className="p-3 text-sm font-semibold">الحالة</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredDisbursements.map(d => (
                                <tr key={d.disbursement_id}>
                                    <td className="p-3">{d.disbursement_id}</td>
                                    <td className="p-3">{d.date}</td>
                                    <td className="p-3">{d.beneficiary}</td>
                                    <td className="p-3">{d.amount}</td>
                                    <td className="p-3">{d.purpose}</td>
                                    <td className="p-3">{d.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DisbursementsReport;