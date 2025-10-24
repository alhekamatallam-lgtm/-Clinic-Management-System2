import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { VisitType } from '../types';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const ManualRevenue: React.FC = () => {
    const { clinics, doctors, addManualRevenue, isAdding } = useApp();
    const today = getLocalYYYYMMDD(new Date());

    const [formData, setFormData] = useState({
        patient_name: '',
        clinic_id: clinics[0]?.clinic_id || 0,
        amount: '',
        date: today,
        type: VisitType.FirstVisit,
        notes: '',
    });

    const getDoctorName = (doctorId: number) => {
        return doctors.find(d => d.doctor_id === doctorId)?.doctor_name || 'N/A';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'clinic_id' || name === 'amount' ? Number(value) : value,
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const success = await addManualRevenue({
            visit_id: 0, // Explicitly set visit_id for unlinked revenue
            patient_id: 0, // Keep old behavior: unlinked patient
            patient_name: formData.patient_name,
            clinic_id: formData.clinic_id,
            amount: Number(formData.amount),
            date: formData.date,
            type: formData.type as VisitType,
            notes: formData.notes,
        });

        // Reset form only on successful submission
        if (success) {
            setFormData({
                patient_name: '',
                clinic_id: clinics[0]?.clinic_id || 0,
                amount: '',
                date: today,
                type: VisitType.FirstVisit,
                notes: '',
            });
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md max-w-2xl mx-auto">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6 border-b dark:border-gray-700 pb-4">إضافة إيراد يدوي</h1>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="patient_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label>
                    <input
                        type="text"
                        name="patient_name"
                        id="patient_name"
                        value={formData.patient_name}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="clinic_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">العيادة</label>
                    <select
                        name="clinic_id"
                        id="clinic_id"
                        value={formData.clinic_id}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    >
                        {clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name} - {getDoctorName(c.doctor_id)}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ</label>
                    <input
                        type="number"
                        name="amount"
                        id="amount"
                        value={formData.amount}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                        min="0"
                    />
                </div>
                <div>
                    <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">تاريخ الإيراد</label>
                    <input
                        type="date"
                        name="date"
                        id="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    />
                </div>
                <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الإيراد</label>
                    <select
                        name="type"
                        id="type"
                        value={formData.type}
                        onChange={handleChange}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                    >
                        <option value={VisitType.FirstVisit}>كشف جديد</option>
                        <option value={VisitType.FollowUp}>متابعة</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                    <textarea
                        name="notes"
                        id="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows={3}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="أي تفاصيل إضافية..."
                    />
                </div>
                <div>
                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الحفظ...' : 'حفظ الإيراد'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ManualRevenue;