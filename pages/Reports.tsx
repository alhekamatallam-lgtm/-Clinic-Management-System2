import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon } from '@heroicons/react/24/solid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import StatCard from '../components/ui/StatCard';
import { CurrencyDollarIcon, UserGroupIcon } from '@heroicons/react/24/outline';

const Reports: React.FC = () => {
    const { revenues, clinics, doctors, visits } = useApp();
    
    // Filters
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [doctorFilter, setDoctorFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    const filteredRevenues = useMemo(() => {
        let temp = [...revenues];
        if (clinicFilter !== 'all') {
            temp = temp.filter(r => r.clinic_id === parseInt(clinicFilter));
        }
        if (doctorFilter !== 'all') {
            const doctorClinics = clinics.filter(c => c.doctor_id === parseInt(doctorFilter)).map(c => c.clinic_id);
            temp = temp.filter(r => doctorClinics.includes(r.clinic_id));
        }
        if (startDate) {
            temp = temp.filter(r => r.date >= startDate);
        }
        if (endDate) {
            temp = temp.filter(r => r.date <= endDate);
        }
        return temp;
    }, [revenues, clinics, clinicFilter, doctorFilter, startDate, endDate]);

    const summaryStats = useMemo(() => {
        const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
        const relatedVisitIds = new Set(filteredRevenues.map(r => r.visit_id));
        const totalVisits = visits.filter(v => relatedVisitIds.has(v.visit_id)).length;
        
        return {
            totalRevenue,
            totalVisits
        };
    }, [filteredRevenues, visits]);

    const revenueByClinicChart = useMemo(() => {
        const data: { [key: string]: number } = {};
        filteredRevenues.forEach(r => {
            const clinicName = clinics.find(c => c.clinic_id === r.clinic_id)?.clinic_name || 'غير معروف';
            data[clinicName] = (data[clinicName] || 0) + r.amount;
        });
        return Object.entries(data).map(([name, الإيرادات]) => ({ name, الإيرادات }));
    }, [filteredRevenues, clinics]);
    
    const revenueOverTimeChart = useMemo(() => {
        const data: { [key: string]: number } = {};
        filteredRevenues.forEach(r => {
            if (r.date) {
                data[r.date] = (data[r.date] || 0) + r.amount;
            }
        });
        return Object.entries(data)
            .map(([date, الإيرادات]) => ({ date, الإيرادات }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [filteredRevenues]);

    const resetFilters = () => {
        setClinicFilter('all');
        setDoctorFilter('all');
        setStartDate('');
        setEndDate('');
    };

    const handlePrint = () => window.print();

    return (
        <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md no-print">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقارير الإيرادات</h1>
                    <button onClick={handlePrint} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600">
                        <PrinterIcon className="h-5 w-5 ml-2"/>
                        طباعة
                    </button>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg flex flex-wrap items-center gap-4">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select value={clinicFilter} onChange={e => setClinicFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="all">كل العيادات</option>
                        {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name}</option>)}
                    </select>
                    <select value={doctorFilter} onChange={e => setDoctorFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="all">كل الأطباء</option>
                        {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>)}
                    </select>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <button onClick={resetFilters} className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                        <XMarkIcon className="h-4 w-4 ml-1" />
                        مسح
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatCard title="إجمالي الإيرادات" value={`${summaryStats.totalRevenue.toLocaleString()} ريال`} icon={CurrencyDollarIcon} color="bg-green-500" />
                <StatCard title="إجمالي الزيارات المرتبطة" value={summaryStats.totalVisits} icon={UserGroupIcon} color="bg-blue-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4">الإيرادات حسب العيادة</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByClinicChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString()} ريال`} />
                            <Legend />
                            <Bar dataKey="الإيرادات" fill="#14b8a6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                     <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4">الإيرادات عبر الزمن</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={revenueOverTimeChart}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value: number) => `${value.toLocaleString()} ريال`} />
                            <Legend />
                            <Line type="monotone" dataKey="الإيرادات" stroke="#3b82f6" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4">تفاصيل الإيرادات</h3>
                 <div className="overflow-x-auto">
                    <table className="w-full text-right">
                         <thead className="bg-gray-100 dark:bg-gray-700">
                             <tr>
                                 <th className="p-3">#</th>
                                 <th className="p-3">التاريخ</th>
                                 <th className="p-3">المريض</th>
                                 <th className="p-3">العيادة</th>
                                 <th className="p-3">المبلغ</th>
                             </tr>
                         </thead>
                         <tbody>
                            {filteredRevenues.map(r => (
                                <tr key={r.revenue_id} className="border-b dark:border-gray-700">
                                    <td className="p-3">{r.revenue_id}</td>
                                    <td className="p-3">{r.date}</td>
                                    <td className="p-3">{r.patient_name}</td>
                                    <td className="p-3">{clinics.find(c => c.clinic_id === r.clinic_id)?.clinic_name || 'N/A'}</td>
                                    <td className="p-3 font-bold">{r.amount}</td>
                                </tr>
                            ))}
                         </tbody>
                    </table>
                 </div>
            </div>
        </div>
    );
};

export default Reports;
