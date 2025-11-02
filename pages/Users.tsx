import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Role, User, Clinic, Doctor } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, PencilIcon, KeyIcon, NoSymbolIcon, CheckCircleIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const translateRole = (role: Role) => {
    switch(role) {
        case Role.Manager: return 'مدير';
        case Role.Doctor: return 'طبيب';
        case Role.Reception: return 'موظف استقبال';
        case Role.Accountant: return 'محاسب';
        case Role.QueueScreen: return 'شاشة عرض الانتظار';
        default: return role;
    }
}

const Users: React.FC = () => {
    const { user: currentUser, users, clinics, doctors, addUser, updateUser } = useApp();
    
    // State for modals
    const [isAddEditModalOpen, setAddEditModalOpen] = useState(false);
    const [isPasswordModalOpen, setPasswordModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    
    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    // State for forms
    const initialFormState: Partial<User> = { Name: '', role: Role.Reception, username: '', password: '', clinic_id: undefined, doctor_id: undefined, doctor_name: undefined, status: 'مفعل' };
    const [formData, setFormData] = useState<Partial<User>>(initialFormState);
    const [passwordData, setPasswordData] = useState({ password: '', confirmPassword: '' });
    const [selectedDoctorForForm, setSelectedDoctorForForm] = useState<Doctor | null>(null);

    const isManager = currentUser?.role === Role.Manager;

    // Pagination calculations
    const totalPages = Math.ceil(users.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = users.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleOpenAddModal = () => {
        setSelectedUser(null);
        setFormData(initialFormState);
        setSelectedDoctorForForm(null);
        setAddEditModalOpen(true);
    };

    const handleOpenEditModal = (userToEdit: User) => {
        setSelectedUser(userToEdit);
        setFormData({ 
            Name: userToEdit.Name, 
            username: userToEdit.username, 
            role: userToEdit.role, 
            clinic_id: userToEdit.clinic_id,
            doctor_id: userToEdit.doctor_id,
            doctor_name: userToEdit.doctor_name,
            status: userToEdit.status,
        });
        
        if (userToEdit.role === Role.Doctor && userToEdit.doctor_id) {
            const linkedDoctor = doctors.find(d => d.doctor_id === userToEdit.doctor_id);
            setSelectedDoctorForForm(linkedDoctor || null);
        } else {
            setSelectedDoctorForForm(null);
        }
        setAddEditModalOpen(true);
    };
    
    const handleOpenPasswordModal = (userToChange: User) => {
        setSelectedUser(userToChange);
        setPasswordData({ password: '', confirmPassword: '' });
        setPasswordModalOpen(true);
    };

    const handleToggleStatus = (user: User) => {
        const newStatus = user.status === 'مفعل' ? 'معطل' : 'مفعل';
        const actionText = newStatus === 'مفعل' ? 'تفعيل' : 'تعطيل';
        const message = newStatus === 'مفعل' 
            ? `سيتمكن المستخدم من تسجيل الدخول مرة أخرى.`
            : `لن يتمكن المستخدم من تسجيل الدخول.`;

        if (window.confirm(`هل أنت متأكد من ${actionText} حساب المستخدم "${user.Name || user.username}"؟ ${message}`)) {
            // To prevent the backend from clearing other fields on a partial update,
            // we send the entire user object with the modified status.
            const { user_id, ...userDataToSend } = user;
            updateUser(user.user_id, { ...userDataToSend, status: newStatus });
        }
    };


    const handleCloseModals = () => {
        setAddEditModalOpen(false);
        setPasswordModalOpen(false);
        setSelectedUser(null);
        setFormData(initialFormState);
        setPasswordData({ password: '', confirmPassword: '' });
        setSelectedDoctorForForm(null);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const newFormData = { ...formData, [name]: value };

        if (name === 'role') {
            // When role changes, clear doctor-specific fields.
            setSelectedDoctorForForm(null);
            newFormData.doctor_id = undefined;
            newFormData.doctor_name = undefined;
            newFormData.clinic_id = undefined;

            // When switching TO a Doctor, the name/username must be derived from the selected doctor,
            // so we clear the existing manually-entered ones. For other role changes 
            // (e.g., Manager to Receptionist), preserving the name provides a better experience.
            if (value === Role.Doctor) {
                newFormData.Name = '';
                newFormData.username = '';
            }
        }

        setFormData(newFormData);
    };
    
    const handleDoctorSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedDoctorId = e.target.value;
        const doctor = doctors.find(d => d.doctor_id.toString() === selectedDoctorId);
    
        if (doctor) {
            setSelectedDoctorForForm(doctor);
            
            // The doctor's own record contains the clinic_id they are assigned to.
            // This is the correct source of truth for creating their user account.
            const assignedClinicId = doctor.clinic_id;

            // Find the clinic to ensure it exists, but use the doctor's assigned clinic ID.
            const clinicExists = clinics.some(c => c.clinic_id === assignedClinicId);
            if (!clinicExists) {
                alert(`تنبيه: العيادة المعينة للطبيب '${doctor.doctor_name}' (ID: ${assignedClinicId}) غير موجودة في قائمة العيادات. يرجى مراجعة بيانات الطبيب.`);
            }
    
            setFormData(prev => ({
                ...prev,
                Name: doctor.doctor_name,
                // The user's clinic_id is now derived from the doctor's own record.
                clinic_id: assignedClinicId,
                doctor_id: doctor.doctor_id,
                doctor_name: doctor.doctor_name,
            }));
        } else {
            setSelectedDoctorForForm(null);
            setFormData(prev => ({
                ...prev,
                Name: '',
                username: '',
                clinic_id: undefined,
                doctor_id: undefined,
                doctor_name: undefined,
            }));
        }
    };

    const handleAddEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedUser) { // Editing existing user
            const { password, ...updateData } = formData; // Exclude password from edit form
            updateUser(selectedUser.user_id, updateData);
        } else { // Adding new user
            if (!formData.password) {
                alert("كلمة المرور مطلوبة للمستخدم الجديد.");
                return;
            }
             if (formData.role === Role.Doctor && !selectedDoctorForForm) {
                alert("يرجى اختيار طبيب لإنشاء حساب له.");
                return;
            }
            addUser(formData as Omit<User, 'user_id'>);
        }
        handleCloseModals();
    };

    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.password !== passwordData.confirmPassword) {
            alert("كلمتا المرور غير متطابقتين!");
            return;
        }
        if (selectedUser) {
            // To address the bug where changing a password creates a new user row,
            // we now send the complete user object along with the new password.
            // This works around a backend issue where a minimal payload was being
            // misinterpreted, ensuring the existing user row is correctly updated.
            const { password, ...restOfUser } = selectedUser;
            const updateData = { ...restOfUser, password: passwordData.password };
            updateUser(selectedUser.user_id, updateData);
        }
        handleCloseModals();
    };

    const getStatusChip = (status: 'مفعل' | 'معطل' | undefined) => {
        if (!status) return null;

        if (status.trim() === 'مفعل') {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    <CheckCircleIcon className="h-4 w-4 ml-1 text-green-500" />
                    مفعل
                </span>
            );
        } else { // 'معطل'
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                    <NoSymbolIcon className="h-4 w-4 ml-1 text-red-500" />
                    معطل
                </span>
            );
        }
    };

    const isDoctorForm = formData.role === Role.Doctor;

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, users.length)} من أصل {users.length} سجل
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
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة المستخدمين</h1>
                {isManager && (
                    <button onClick={handleOpenAddModal} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة مستخدم جديد
                    </button>
                )}
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاسم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المستخدم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الصلاحية</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            {isManager && <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراءات</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentUsers.map(userRow => {
                            const isSelf = currentUser?.user_id === userRow.user_id;
                            return (
                                <tr key={userRow.user_id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${userRow.status === 'معطل' ? 'opacity-60 bg-gray-50 dark:bg-gray-800/50' : ''}`}>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{userRow.user_id}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{userRow.Name}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{userRow.username}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{translateRole(userRow.role)}</td>
                                    <td className="p-3 text-sm">{getStatusChip(userRow.status)}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{clinics.find(c => c.clinic_id === userRow.clinic_id)?.clinic_name || 'N/A'}</td>
                                    {isManager && (
                                        <td className="p-3 text-sm text-gray-700 dark:text-gray-300 flex items-center gap-1">
                                            <button onClick={() => handleOpenEditModal(userRow)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full dark:hover:bg-blue-900 disabled:opacity-50 disabled:cursor-not-allowed" title="تعديل" disabled={isSelf}>
                                                <PencilIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleOpenPasswordModal(userRow)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-full dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" title="تغيير كلمة المرور" disabled={isSelf}>
                                                <KeyIcon className="h-5 w-5" />
                                            </button>
                                            <button onClick={() => handleToggleStatus(userRow)} className={`p-2 rounded-full ${userRow.status === 'مفعل' ? 'text-red-600 hover:bg-red-100 dark:hover:bg-red-900' : 'text-green-600 hover:bg-green-100 dark:hover:bg-green-900'} disabled:opacity-50 disabled:cursor-not-allowed`} title={userRow.status === 'مفعل' ? 'تعطيل' : 'تفعيل'} disabled={isSelf}>
                                                {userRow.status === 'مفعل' ? <NoSymbolIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />}
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <PaginationControls />

            <Modal title={selectedUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'} isOpen={isAddEditModalOpen} onClose={handleCloseModals}>
                <form onSubmit={handleAddEditSubmit} className="space-y-4">
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">الصلاحية</label>
                        <select name="role" value={formData.role || ''} onChange={handleFormChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required>
                            <option value={Role.Reception}>موظف استقبال</option>
                            <option value={Role.Accountant}>محاسب</option>
                            <option value={Role.Doctor}>طبيب</option>
                            <option value={Role.Manager}>مدير</option>
                            <option value={Role.QueueScreen}>شاشة عرض الانتظار</option>
                        </select>
                    </div>

                    {isDoctorForm ? (
                        <>
                             <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">اختر الطبيب</label>
                                <select 
                                    value={selectedDoctorForForm?.doctor_id || ''} 
                                    onChange={handleDoctorSelectChange} 
                                    className="w-full p-2 border rounded bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" 
                                    required
                                >
                                    <option value="">-- اختر طبيب --</option>
                                    {doctors.map(d => <option key={d.doctor_id} value={d.doctor_id}>{d.doctor_name}</option>)}
                                </select>
                            </div>
                            
                            <div>
                                <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                                <input 
                                    type="text" 
                                    value={formData.Name || ''} 
                                    className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500" 
                                    readOnly 
                                />
                            </div>
                        </>
                    ) : (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">الاسم</label>
                            <input type="text" name="Name" value={formData.Name || ''} onChange={handleFormChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                    )}
                    
                    <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">اسم المستخدم</label>
                        <input type="text" name="username" value={formData.username || ''} onChange={handleFormChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    </div>

                    {isDoctorForm && (
                        <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">العيادة</label>
                            <input 
                                type="text" 
                                value={clinics.find(c => c.clinic_id === formData.clinic_id)?.clinic_name || ''} 
                                className="w-full p-2 border rounded bg-gray-100 dark:bg-gray-600 dark:border-gray-500" 
                                readOnly 
                            />
                        </div>
                    )}
                    
                    {!selectedUser && (
                         <div>
                            <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور</label>
                            <input type="password" name="password" value={formData.password || ''} onChange={handleFormChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                        </div>
                    )}
                    
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">
                        {selectedUser ? 'حفظ التعديلات' : 'إضافة المستخدم'}
                    </button>
                </form>
            </Modal>

            <Modal title={`تغيير كلمة مرور ${selectedUser?.username}`} isOpen={isPasswordModalOpen} onClose={handleCloseModals}>
                 <form onSubmit={handlePasswordSubmit} className="space-y-4">
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</label>
                        <input type="password" value={passwordData.password} onChange={e => setPasswordData(p => ({...p, password: e.target.value}))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    </div>
                     <div>
                        <label className="block mb-1 text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</label>
                        <input type="password" value={passwordData.confirmPassword} onChange={e => setPasswordData(p => ({...p, confirmPassword: e.target.value}))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    </div>
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">
                        تغيير كلمة المرور
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Users;