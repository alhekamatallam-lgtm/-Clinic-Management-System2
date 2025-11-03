import React, { useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import StatCard from '../ui/StatCard';
import { CurrencyDollarIcon, CalendarDaysIcon, BanknotesIcon } from '@heroicons/react/24/solid';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ManagerDashboard: React.FC = () => {
    const { visits, clinics, revenues, disbursements } = useApp();
    
    const { dailyRevenue, thisWeekRevenue, thisMonthRevenue, totalRevenue, dailyDisbursements } = useMemo(() => {
        const today = new Date();
        const currentDayOfWeek = today.getDay(); // Sunday = 0
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
    
        // Boundaries for This Week (assuming Sunday as the start of the week)
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - currentDayOfWeek);
        const startOfWeekStr = getLocalYYYYMMDD(startOfWeek);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        const endOfWeekStr = getLocalYYYYMMDD(endOfWeek);
    
        // Boundaries for This Month
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const startOfMonthStr = getLocalYYYYMMDD(startOfMonth);
        
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0); // Last day of month
        const endOfMonthStr = getLocalYYYYMMDD(endOfMonth);
        
        const todayStr = getLocalYYYYMMDD(today);
    
        let daily = 0;
        let weekly = 0;
        let monthly = 0;
        let total = 0;
    
        revenues.forEach(r => {
            if (!r.date || typeof r.date !== 'string') return;
            
            total += r.amount;
    
            if (r.date === todayStr) {
                daily += r.amount;
            }
    
            if (r.date >= startOfWeekStr && r.date <= endOfWeekStr) {
                weekly += r.amount;
            }
    
            if (r.date >= startOfMonthStr && r.date <= endOfMonthStr) {
                monthly += r.amount;
            }
        });
        
        const disbursementsToday = disbursements
            .filter(d => d.date === todayStr)
            .reduce((sum, d) => sum + d.amount, 0);
    
        return { 
            dailyRevenue: daily, 
            thisWeekRevenue: weekly, 
            thisMonthRevenue: monthly,
            totalRevenue: total,
            dailyDisbursements: disbursementsToday
        };
    }, [revenues, disbursements]);

    
    const revenueByClinic = clinics.map(clinic => {
        const clinicRevenue = revenues
            .filter(r => r.clinic_id === clinic.clinic_id)
            .reduce((sum, r) => sum + r.amount, 0);
        return { name: clinic.clinic_name, 'الإيرادات': clinicRevenue };
    });

    const dailyVisitData = useMemo(() => {
        const last7Days: { [key: string]: number } = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = getLocalYYYYMMDD(d);
            last7Days[dateString] = 0;
        }
        visits.forEach(visit => {
            const visitDate = visit.visit_date;
            if (visitDate && last7Days[visitDate] !== undefined) {
                last7Days[visitDate]++;
            }
        });
    
        return Object.keys(last7Days).map(date => ({
            name: new Date(date + 'T00:00:00').toLocaleDateString('ar-EG', { weekday: 'short' }),
            'الزيارات': last7Days[date],
        }));
    }, [visits]);

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="إيرادات اليوم" value={`${dailyRevenue} جنيه`} icon={CurrencyDollarIcon} color="bg-green-500" />
                <StatCard title="مصروفات اليوم" value={`${dailyDisbursements} جنيه`} icon={BanknotesIcon} color="bg-red-500" />
                <StatCard title="إيرادات هذا الأسبوع" value={`${thisWeekRevenue} جنيه`} icon={CalendarDaysIcon} color="bg-blue-500" />
                <StatCard title="إيرادات هذا الشهر" value={`${thisMonthRevenue} جنيه`} icon={BanknotesIcon} color="bg-indigo-500" />
                <StatCard title="إجمالي الإيرادات" value={`${totalRevenue} جنيه`} icon={CurrencyDollarIcon} color="bg-purple-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4">الإيرادات حسب العيادة</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={revenueByClinic}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${value} جنيه`} />
                            <Legend />
                            <Bar dataKey="الإيرادات" fill="#14b8a6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                    <h3 className="font-bold text-teal-800 dark:text-teal-300 mb-4">عدد الزيارات (آخر 7 أيام)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={dailyVisitData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="الزيارات" fill="#3b82f6" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};

export default ManagerDashboard;