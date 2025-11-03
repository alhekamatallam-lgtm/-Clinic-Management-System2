import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { PrinterIcon } from '@heroicons/react/24/solid';
import { Role } from '../types';

const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DailyClinicReport: React.FC = () => {
    const { clinics, visits, revenues, user, doctors, clinicLogo } = useApp();
    const [selectedDate, setSelectedDate] = useState<string>(getLocalYYYYMMDD(new Date()));
    const [isPrinting, setIsPrinting] = useState(false);

    useEffect(() => {
        if (isPrinting) {
            const handleAfterPrint = () => setIsPrinting(false);
            window.addEventListener('afterprint', handleAfterPrint);
            window.print();
            return () => window.removeEventListener('afterprint', handleAfterPrint);
        }
    }, [isPrinting]);

    const reportData = useMemo(() => {
        const dailyVisits = visits.filter(v => v.visit_date === selectedDate);
        const dailyRevenues = revenues.filter(r => r.date === selectedDate);
        const clinicsToReport = (user?.role === Role.Doctor && user.doctor_id)
            ? clinics.filter(c => c.doctor_id === user.doctor_id)
            : clinics;

        return clinicsToReport.map(clinic => {
            const clinicVisits = dailyVisits.filter(v => v.clinic_id === clinic.clinic_id);
            const clinicRevenues = dailyRevenues.filter(r => r.clinic_id === clinic.clinic_id);
            const totalRevenue = clinicRevenues.reduce((sum, r) => sum + r.amount, 0);
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);

            return {
                clinicId: clinic.clinic_id,
                clinicName: clinic.clinic_name,
                doctorName: doctor ? doctor.doctor_name : 'N/A',
                caseCount: clinicVisits.length,
                totalRevenue: totalRevenue,
            };
        });
    }, [clinics, visits, revenues, selectedDate, user, doctors]);

    const grandTotals = useMemo(() => {
        const totalCases = reportData.reduce((sum, data) => sum + data.caseCount, 0);
        const totalRevenue = reportData.reduce((sum, data) => sum + data.totalRevenue, 0);
        return { totalCases, totalRevenue };
    }, [reportData]);

    const handlePrint = () => {
        setIsPrinting(true);
    };

    const PrintableContent = () => (
        <div className="bg-white text-black p-6">
            <div className="text-center mb-6">
                 {clinicLogo && <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto mx-auto mb-4 object-contain" />}
                 <h1 className="text-2xl font-bold text-black">تقرير العيادات اليومي</h1>
                 <p className="text-lg text-gray-700">لتاريخ: {selectedDate}</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">عدد الحالات</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجمالي الإيراد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {reportData.map(data => (
                            <tr key={data.clinicId}>
                                <td className="p-3 text-sm font-medium">{data.clinicName}</td>
                                <td className="p-3 text-sm">{data.doctorName}</td>
                                <td className="p-3 text-sm">{data.caseCount}</td>
                                <td className="p-3 text-sm font-bold">{data.totalRevenue.toFixed(2)} ريال</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                        <tr>
                            <td colSpan={2} className="p-3 text-sm font-bold text-left">الإجمالي</td>
                            <td className="p-3 text-sm font-bold text-teal-700">{grandTotals.totalCases}</td>
                            <td className="p-3 text-sm font-bold text-teal-700">{grandTotals.totalRevenue.toFixed(2)} ريال</td>
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
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقرير العيادات اليومي</h1>
                <div className="flex items-center gap-4">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={e => setSelectedDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button
                        onClick={handlePrint}
                        className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <PrinterIcon className="h-5 w-5 ml-2" />
                        طباعة
                    </button>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">عدد الحالات</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجمالي الإيراد</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {reportData.map(data => (
                            <tr key={data.clinicId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{data.clinicName}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{data.doctorName}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{data.caseCount}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{data.totalRevenue.toFixed(2)} ريال</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={2} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">الإجمالي</td>
                            <td className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400">{grandTotals.totalCases}</td>
                            <td className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400">{grandTotals.totalRevenue.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

export default DailyClinicReport;