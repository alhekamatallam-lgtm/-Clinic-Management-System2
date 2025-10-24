import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Patient, Visit, VisitStatus, VisitType, Diagnosis } from '../types';
import Modal from '../components/ui/Modal';
import { ChevronRightIcon, ChevronLeftIcon, PlusIcon, MagnifyingGlassIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const Patients: React.FC = () => {
    const { patients, clinics, doctors, visits, diagnoses, addPatient, addVisit, isAddingVisit, addManualRevenue, isAdding, showNotification } = useApp();
    
    // Modals
    const [isAddPatientModalOpen, setAddPatientModalOpen] = useState(false);
    const [isAddVisitModalOpen, setAddVisitModalOpen] = useState(false);
    const [isPastDiagnosesModalOpen, setPastDiagnosesModalOpen] = useState(false);

    // Forms & Selections
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
    const [newPatient, setNewPatient] = useState<Omit<Patient, 'patient_id'>>({ name: '', dob: '', gender: 'ذكر', phone: '', address: '' });
    const [modalMode, setModalMode] = useState<'visit' | 'revenue'>('visit');
    const newlyCreatedVisitRef = useRef<Visit | null>(null);
    
    const today = getLocalYYYYMMDD(new Date());
    const initialFormState = {
        clinic_id: clinics[0]?.clinic_id || 0,
        visit_type: VisitType.FirstVisit,
        notes: '',
        base_amount: 0,
        discount: '',
        revenue_date: today,
        visit_time: '',
        visit_date: today,
    };
    const [visitFormData, setVisitFormData] = useState(initialFormState);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const patientsPerPage = 10;

    // Derived values for calculation
    const visitDiscountValue = parseFloat(visitFormData.discount) || 0;
    const visitAmountAfterDiscount = Math.max(0, visitFormData.base_amount - visitDiscountValue);

    const getDoctorName = (doctorId: number) => {
        return doctors.find(d => d.doctor_id === doctorId)?.doctor_name || 'N/A';
    };

    const getEffectiveStatus = (visit: Visit): VisitStatus => {
        const isDiagnosed = diagnoses.some(d => d.visit_id === visit.visit_id);
        if (isDiagnosed && visit.status !== VisitStatus.Canceled) {
            return VisitStatus.Completed;
        }
        return visit.status;
    };

    const waitingCountByClinic = useMemo(() => {
        const todayStr = getLocalYYYYMMDD(new Date());
        const counts: { [key: number]: number } = {};
        const waitingVisits = visits.filter(v => 
            v.visit_date === todayStr &&
            (getEffectiveStatus(v) === VisitStatus.Waiting || getEffectiveStatus(v) === VisitStatus.InProgress)
        );
        waitingVisits.forEach(visit => {
            counts[visit.clinic_id] = (counts[visit.clinic_id] || 0) + 1;
        });
        return counts;
    }, [visits, diagnoses]);

    useEffect(() => {
        if (isAddVisitModalOpen && visitFormData.clinic_id && clinics.length > 0) {
            const selectedClinic = clinics.find(c => c.clinic_id === visitFormData.clinic_id);
            if (selectedClinic) {
                const price = visitFormData.visit_type === VisitType.FirstVisit
                    ? selectedClinic.price_first_visit
                    : selectedClinic.price_followup;
                setVisitFormData(prev => ({ ...prev, base_amount: price, discount: '' }));
            }
        }
    }, [visitFormData.clinic_id, visitFormData.visit_type, clinics, isAddVisitModalOpen]);

    const pastDiagnosesForSelectedPatient = useMemo(() => {
        if (!selectedPatient) return [];
        const patientVisits = visits.filter(v => v.patient_id === selectedPatient.patient_id);
        const patientVisitIds = patientVisits.map(v => v.visit_id);
        const patientDiagnoses = diagnoses.filter(d => patientVisitIds.includes(d.visit_id));
        return patientDiagnoses.map(diag => {
            const visit = patientVisits.find(v => v.visit_id === diag.visit_id);
            return { ...diag, visit_date: visit?.visit_date || 'N/A' };
        }).sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    }, [selectedPatient, visits, diagnoses]);

    const filteredPatients = useMemo(() => {
        if (!searchTerm) return patients;
        return patients.filter(p =>
            p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(p.phone).includes(searchTerm)
        );
    }, [patients, searchTerm]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    const indexOfLastPatient = currentPage * patientsPerPage;
    const indexOfFirstPatient = indexOfLastPatient - patientsPerPage;
    const currentPatients = filteredPatients.slice(indexOfFirstPatient, indexOfLastPatient);
    const totalPages = Math.ceil(filteredPatients.length / patientsPerPage);

    const paginate = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const handleAddPatient = (e: React.FormEvent) => {
        e.preventDefault();
        addPatient(newPatient);
        setNewPatient({ name: '', dob: '', gender: 'ذكر', phone: '', address: '' });
        setAddPatientModalOpen(false);
    };

    const handleCloseVisitModal = () => {
        setAddVisitModalOpen(false);
        setSelectedPatient(null);
        newlyCreatedVisitRef.current = null;
    };

    const handleAddVisit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        if (newlyCreatedVisitRef.current) {
            showNotification('تمت إضافة الزيارة بالفعل.', 'error');
            return;
        }
        try {
            const createdVisit = await addVisit({
                patient_id: selectedPatient.patient_id,
                clinic_id: visitFormData.clinic_id,
                visit_type: visitFormData.visit_type,
                visit_time: visitFormData.visit_time,
                visit_date: visitFormData.visit_date,
            });
            newlyCreatedVisitRef.current = createdVisit;
            showNotification('تمت إضافة الزيارة بنجاح. الآن يمكنك تسجيل الإيراد.', 'success');
            setModalMode('revenue');
        } catch (error: any) {
            showNotification(error.message || 'حدث خطأ غير متوقع أثناء إضافة الزيارة.', 'error');
        }
    };

    const handleAddRevenue = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPatient) return;
        const visitIdForRevenue = newlyCreatedVisitRef.current ? newlyCreatedVisitRef.current.visit_id : 0;
        const success = await addManualRevenue({
            visit_id: visitIdForRevenue,
            patient_id: selectedPatient.patient_id,
            patient_name: selectedPatient.name,
            clinic_id: visitFormData.clinic_id,
            amount: visitAmountAfterDiscount,
            date: visitFormData.revenue_date,
            type: visitFormData.visit_type,
            notes: visitFormData.notes || '',
        });
        if (success) {
            showNotification('تم تسجيل الإيراد بنجاح', 'success');
            handleCloseVisitModal();
        }
    };

    const openAddVisitModal = (patient: Patient) => {
        setSelectedPatient(patient);
        const initialClinicId = clinics[0]?.clinic_id || 0;
        const initialClinic = clinics.find(c => c.clinic_id === initialClinicId);
        const initialPrice = initialClinic ? initialClinic.price_first_visit : 0;
        setVisitFormData({
            ...initialFormState,
            clinic_id: initialClinicId,
            base_amount: initialPrice,
        });
        newlyCreatedVisitRef.current = null;
        setModalMode('visit');
        setAddVisitModalOpen(true);
    };

    const handleVisitFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setVisitFormData(prev => ({ ...prev, [name]: name === 'clinic_id' ? Number(value) : value }));
    };

    const PaginationControls = () => (
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
            <span className="text-sm text-gray-700 dark:text-gray-400">
                عرض {indexOfFirstPatient + 1} إلى {Math.min(indexOfLastPatient, filteredPatients.length)} من أصل {filteredPatients.length} سجل
            </span>
            <div className="flex items-center gap-2">
                <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                    <ChevronRightIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">السابق</span>
                </button>
                <span className="text-sm text-gray-700 dark:text-gray-400">صفحة {currentPage} من {totalPages}</span>
                <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages} className="flex items-center justify-center px-3 h-8 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white">
                    <span className="hidden sm:inline">التالي</span>
                    <ChevronLeftIcon className="w-4 h-4" />
                </button>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">قائمة المرضى</h1>
                <div className="flex items-center gap-4 w-full sm:w-auto">
                    <div className="relative flex-grow">
                        <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                        </span>
                        <input type="text" placeholder="ابحث بالاسم أو الهاتف..." className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                    </div>
                    <button onClick={() => setAddPatientModalOpen(true)} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors flex-shrink-0">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة مريض
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الرقم التعريفي</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الاسم</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الهاتف</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الجنس</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentPatients.map(patient => (
                            <tr key={patient.patient_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.patient_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{patient.name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.phone}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{patient.gender}</td>
                                <td className="p-3">
                                    <button onClick={() => openAddVisitModal(patient)} className="bg-green-500 text-white px-3 py-1 rounded-md text-sm hover:bg-green-600">
                                        تسجيل كشف
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {totalPages > 1 && <PaginationControls />}

            <Modal title="إضافة مريض جديد" isOpen={isAddPatientModalOpen} onClose={() => setAddPatientModalOpen(false)}>
                <form onSubmit={handleAddPatient} className="space-y-4">
                    <input type="text" placeholder="الاسم الكامل" value={newPatient.name} onChange={e => setNewPatient({...newPatient, name: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="date" placeholder="تاريخ الميلاد" value={newPatient.dob} onChange={e => setNewPatient({...newPatient, dob: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <select value={newPatient.gender} onChange={e => setNewPatient({...newPatient, gender: e.target.value as 'ذكر' | 'أنثى'})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                        <option value="ذكر">ذكر</option>
                        <option value="أنثى">أنثى</option>
                    </select>
                    <input type="tel" placeholder="رقم الهاتف" value={newPatient.phone} onChange={e => setNewPatient({...newPatient, phone: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="text" placeholder="العنوان" value={newPatient.address} onChange={e => setNewPatient({...newPatient, address: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">إضافة</button>
                </form>
            </Modal>
            
            <Modal title={`إجراء للمريض: ${selectedPatient?.name}`} isOpen={isAddVisitModalOpen} onClose={handleCloseVisitModal}>
                <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                    <button onClick={() => setModalMode('visit')} className={`px-4 py-2 text-sm font-medium transition-colors ${modalMode === 'visit' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>تسجيل زيارة</button>
                    <button onClick={() => setModalMode('revenue')} className={`px-4 py-2 text-sm font-medium transition-colors ${modalMode === 'revenue' ? 'border-b-2 border-teal-500 text-teal-600 dark:text-teal-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>إضافة إيراد</button>
                </div>
                {modalMode === 'visit' ? (
                    <form onSubmit={handleAddVisit} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label>
                                <div className="flex items-center gap-2">
                                    <input type="text" value={selectedPatient?.name || ''} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                                    <button type="button" onClick={() => setPastDiagnosesModalOpen(true)} className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex-shrink-0" title="عرض التشخيصات السابقة"><ClipboardDocumentListIcon className="h-5 w-5" /></button>
                                </div>
                            </div>
                            <select name="clinic_id" value={visitFormData.clinic_id} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >{clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name} - {getDoctorName(c.doctor_id)} (الانتظار: {waitingCountByClinic[c.clinic_id] || 0})</option>)}</select>
                            <select name="visit_type" value={visitFormData.visit_type} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required ><option value={VisitType.FirstVisit}>كشف جديد</option><option value={VisitType.FollowUp}>متابعة</option></select>
                            <input id="visit_date" type="date" name="visit_date" value={visitFormData.visit_date} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            <input id="visit_time" type="time" name="visit_time" value={visitFormData.visit_time || ''} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                        </div>
                        <button type="submit" className="w-full bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 transition-colors" disabled={isAddingVisit || !!newlyCreatedVisitRef.current} title={newlyCreatedVisitRef.current ? "تمت إضافة الزيارة بالفعل" : ""}>{isAddingVisit ? 'جاري إضافة الزيارة...' : 'تأكيد الزيارة'}</button>
                    </form>
                ) : (
                    <form onSubmit={handleAddRevenue} className="space-y-4">
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">اسم المريض</label><input type="text" value={selectedPatient?.name || ''} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly /></div>
                            <select name="clinic_id" value={visitFormData.clinic_id} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required >{clinics.map(c => <option key={c.clinic_id} value={c.clinic_id}>{c.clinic_name} - {getDoctorName(c.doctor_id)} (الانتظار: {waitingCountByClinic[c.clinic_id] || 0})</option>)}</select>
                            <select name="visit_type" value={visitFormData.visit_type} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white" required ><option value={VisitType.FirstVisit}>كشف جديد</option><option value={VisitType.FollowUp}>متابعة</option></select>
                            <input type="number" value={visitFormData.base_amount} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                            <input type="number" name="discount" value={visitFormData.discount} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" min="0" placeholder="0" />
                            <input type="number" value={visitAmountAfterDiscount} className="w-full p-2 border border-gray-300 rounded-lg bg-gray-100 font-bold text-teal-700 dark:text-teal-400 dark:bg-gray-600 dark:border-gray-500" readOnly />
                            <input type="date" name="revenue_date" value={visitFormData.revenue_date} onChange={handleVisitFormChange} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                            <div className="md:col-span-2"><textarea name="notes" value={visitFormData.notes} onChange={handleVisitFormChange} rows={2} className="w-full p-2 border border-gray-300 rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white" placeholder="أي تفاصيل إضافية..." /></div>
                        </div>
                        <button type="submit" className="w-full bg-teal-500 text-white p-3 rounded-lg hover:bg-teal-600 disabled:bg-gray-400 transition-colors" disabled={isAdding}>{isAdding ? 'جاري الحفظ...' : 'إضافة الإيراد'}</button>
                    </form>
                )}
            </Modal>
            
            <Modal title={`التشخيصات السابقة لـ: ${selectedPatient?.name}`} isOpen={isPastDiagnosesModalOpen} onClose={() => setPastDiagnosesModalOpen(false)}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {pastDiagnosesForSelectedPatient.length > 0 ? pastDiagnosesForSelectedPatient.map(diag => (
                        <div key={diag.diagnosis_id} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="font-bold text-md text-teal-700 dark:text-teal-400">تاريخ الزيارة: {diag.visit_date}</h4><span className="text-sm text-gray-500 dark:text-gray-400">بواسطة: {diag.doctor}</span>
                            </div>
                            <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                            <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                            {diag.labs_needed && diag.labs_needed.length > 0 && diag.labs_needed[0] && (<p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>)}
                            {diag.notes && <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                        </div>
                    )) : (<p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد تشخيصات سابقة لهذا المريض.</p>)}
                </div>
            </Modal>
        </div>
    );
};

export default Patients;