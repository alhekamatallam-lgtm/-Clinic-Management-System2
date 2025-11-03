import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PrinterIcon } from '@heroicons/react/24/solid';
import { VisitType } from '../types';

const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const DailyClinicReport: React.FC = () => {
    const { clinics, doctors, visits, revenues, clinicLogo } = useApp();
    const [reportDate, setReportDate] = useState(getLocalYYYYMMDD(new Date()));

    const reportData = useMemo(() => {
        const dailyVisits = visits.filter(v => v.visit_date === reportDate);
        const dailyRevenues = revenues.filter(r => r.date === reportDate);

        const clinicReports = clinics.map(clinic => {
            const clinicVisits = dailyVisits.filter(v => v.clinic_id === clinic.clinic_id);
            const clinicRevenue = dailyRevenues
                .filter(r => r.clinic_id === clinic.clinic_id)
                .reduce((sum, r) => sum + r.amount, 0);

            const firstVisits = clinicVisits.filter(v => v.visit_type === VisitType.FirstVisit).length;
            const followUpVisits = clinicVisits.filter(v => v.visit_type === VisitType.FollowUp).length;

            return {
                clinicId: clinic.clinic_id,
                clinicName: clinic.clinic_name,
                doctorName: doctors.find(d => d.doctor_id === clinic.doctor_id)?.doctor_name || 'N/A',
                totalVisits: clinicVisits.length,
                firstVisits,
                followUpVisits,
                totalRevenue: clinicRevenue,
            };
        });

        const overallTotalRevenue = clinicReports.reduce((sum, report) => sum + report.totalRevenue, 0);
        const overallTotalVisits = clinicReports.reduce((sum, report) => sum + report.totalVisits, 0);
        
        return { clinicReports, overallTotalRevenue, overallTotalVisits };

    }, [reportDate, clinics, doctors, visits, revenues]);
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">التقرير اليومي للعيادات</h1>
                <div className="flex items-center gap-4 mt-4 sm:mt-0">
                    <input 
                        type="date" 
                        value={reportDate} 
                        onChange={e => setReportDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                    <button onClick={handlePrint} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600">
                        <PrinterIcon className="h-5 w-5 ml-2"/>
                        طباعة
                    </button>
                </div>
            </div>
            
            {/* Printable Area */}
            <div className="printable-area">
                <header className="text-center mb-8">
                    {clinicLogo && <img src={clinicLogo} alt="Logo" className="h-20 mx-auto mb-4" />}
                    <h2 className="text-3xl font-bold">التقرير اليومي للعيادات</h2>
                    <p className="text-lg text-gray-600 dark:text-gray-400">لتاريخ: {new Date(reportDate + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </header>

                 <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse border border-gray-300 dark:border-gray-600">
                        <thead className="bg-gray-100 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">العيادة</th>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">الطبيب</th>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">عدد الكشوفات</th>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">عدد المتابعات</th>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">إجمالي الزيارات</th>
                                <th className="p-3 border border-gray-300 dark:border-gray-600">إجمالي الإيرادات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.clinicReports.map(report => (
                                <tr key={report.clinicId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 border border-gray-300 dark:border-gray-600">{report.clinicName}</td>
                                    <td className="p-3 border border-gray-300 dark:border-gray-600">{report.doctorName}</td>
                                    <td className="p-3 border border-gray-300 dark:border-gray-600">{report.firstVisits}</td>
                                    <td className="p-3 border border-gray-300 dark:border-gray-600">{report.followUpVisits}</td>
                                    <td className="p-3 border border-gray-300 dark:border-gray-600 font-bold">{report.totalVisits}</td>
                                    <td className="p-3 border border-gray-300 dark:border-gray-600 font-bold">{report.totalRevenue.toLocaleString()} جنيه</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-200 dark:bg-gray-800 font-bold">
                            <tr>
                                <td colSpan={4} className="p-3 border border-gray-300 dark:border-gray-600 text-center">الإجمالي العام</td>
                                <td className="p-3 border border-gray-300 dark:border-gray-600">{reportData.overallTotalVisits}</td>
                                <td className="p-3 border border-gray-300 dark:border-gray-600">{reportData.overallTotalRevenue.toLocaleString()} جنيه</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DailyClinicReport;