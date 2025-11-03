import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Clinic, Role } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, PencilIcon, TrashIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const Clinics: React.FC = () => {
    const { user, clinics, doctors, addClinic, updateClinic, deleteClinic, isAdding } = useApp();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const initialFormState: Partial<Omit<Clinic, 'clinic_id' | 'doctor_name'>> = {
        clinic_name: '',
        doctor_id: doctors[0]?.doctor_id || 0,
        max_patients_per_day: 30,
        price_first_visit: 0,
        price_followup: 0,
        shift: 'صباحي',
        notes: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const isManager = user?.role === Role.Manager;

    // Pagination calculations
    const totalPages = Math.ceil(clinics.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentClinics = clinics.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const getDoctorName = (doctorId: number) => {
        return doctors.find(d => d.doctor_id === doctorId)?.doctor_name || 'N/A';
    };

    const handleOpenAddModal = () => {
        setSelectedClinic(null);
        setFormData({ ...initialFormState, doctor_id: doctors[0]?.doctor_id || 0});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (clinic: Clinic) => {
        setSelectedClinic(clinic);
        setFormData({
            clinic_name: clinic.clinic_name,
            doctor_id: clinic.doctor_id,
            max_patients_per_day: clinic.max_patients_per_day,
            price_first_visit: clinic.price_first_visit,
            price_followup: clinic.price_followup,
            shift: clinic.shift,
            notes: clinic.notes,
        });
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClinic(null);
    };

    const handleDelete = (clinicId: number) => {
        if (window.confirm('هل أنت متأكد من حذف هذه العيادة؟ لا يمكن التراجع عن هذا الإجراء.')) {
            deleteClinic(clinicId);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const isNumericField = ['doctor_id', 'max_patients_per_day', 'price_first_visit', 'price_followup'].includes(name);
        setFormData(prev => ({
            ...prev,
            [name]: isNumericField ? Number(value) : value,
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSubmit = {
            ...formData,
            doctor_id: Number(formData.doctor_id),
            max_patients_per_day: Number(formData.max_patients_per_day),
            price_first_visit: Number(formData.price_first_visit),
            price_followup: Number(formData.price_followup),
        };

        if (selectedClinic) { // Editing
            updateClinic(selectedClinic.clinic_id, dataToSubmit);
        } else { // Adding
            addClinic(dataToSubmit as Omit<Clinic, 'clinic_id' | 'doctor_name'>);
        }
        handleCloseModal();
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, clinics.length)} من أصل {clinics.length} سجل
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
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة العيادات</h1>
                {isManager && (
                    <button onClick={handleOpenAddModal} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة عيادة جديدة
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الدوام</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">سعر الكشف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">سعر المتابعة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">ملاحظات</th>
                            {isManager && <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراءات</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentClinics.map(clinic => (
                            <tr key={clinic.clinic_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.clinic_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.clinic_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getDoctorName(clinic.doctor_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.shift}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.price_first_visit} جنيه</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.price_followup} جنيه</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinic.notes}</td>
                                {isManager && (
                                    <td className="p-3 text-sm flex items-center gap-2">
                                        <button onClick={() => handleOpenEditModal(clinic)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full dark:hover:bg-blue-900" title="تعديل">
                                            <PencilIcon className="h-5 w-5" />
                                        </button>
                                        <button onClick={() => handleDelete(clinic.clinic_id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full dark:hover:bg-red-900" title="حذف">
                                            <TrashIcon className="h-5 w-5" />
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <PaginationControls />
            
            <Modal title={selectedClinic ? 'تعديل عيادة' : 'إضافة عيادة جديدة'} isOpen={isModalOpen} onClose={handleCloseModal}>
                <form onSubmit={handleSubmit} className="space-y-4">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم العيادة</label>
                            <input type="text" name="clinic_name" value={formData.clinic_name || ''} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الطبيب</label>
                            <select name="doctor_id" value={formData.doctor_id || ''} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر الكشف</label>
                            <input type="number" name="price_first_visit" value={formData.price_first_visit || ''} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">سعر المتابعة</label>
                            <input type="number" name="price_followup" value={formData.price_followup || ''} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">حد المرضى اليومي</label>
                            <input type="number" name="max_patients_per_day" value={formData.max_patients_per_day || ''} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="1" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الدوام</label>
                            <select name="shift" value={formData.shift || 'صباحي'} onChange={handleChange} className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                                <option value="صباحي">صباحي</option>
                                <option value="مسائي">مسائي</option>
                            </select>
                        </div>
                         <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ملاحظات</label>
                             <textarea name="notes" value={formData.notes || ''} onChange={handleChange} rows={3} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                         </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-teal-600 text-white p-3 rounded-lg hover:bg-teal-700 transition-colors disabled:bg-gray-400"
                        disabled={isAdding}
                    >
                        {isAdding ? 'جاري الحفظ...' : (selectedClinic ? 'حفظ التعديلات' : 'إضافة العيادة')}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Clinics;