import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { VisitStatus, Role, Diagnosis, Visit, Patient } from '../types';
import Modal from '../components/ui/Modal';
import { PencilSquareIcon, FunnelIcon, XMarkIcon, ClipboardDocumentListIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';

const translateVisitStatus = (status: VisitStatus): string => {
    switch (status) {
        case VisitStatus.Waiting: return 'في الانتظار';
        case VisitStatus.InProgress: return 'قيد المعالجة';
        case VisitStatus.Completed: return 'مكتمل';
        case VisitStatus.Canceled: return 'ملغى';
        default: return status;
    }
};

const Visits: React.FC = () => {
    const { user, visits, patients, clinics, doctors, diagnoses, addDiagnosis, updateVisitStatus } = useApp();
    
    // State for modals
    const [isDiagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
    const [isPastDiagnosesModalOpen, setPastDiagnosesModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<number | null>(null);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

    const [newDiagnosis, setNewDiagnosis] = useState<Omit<Diagnosis, 'diagnosis_id'>>({
        visit_id: 0,
        doctor: user?.username || 'Manager',
        diagnosis: '',
        prescription: '',
        labs_needed: [],
        notes: ''
    });

    // State for filters
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const getEffectiveStatus = (visit: Visit): VisitStatus => {
        const isDiagnosed = diagnoses.some(d => d.visit_id === visit.visit_id);
        if (isDiagnosed && visit.status !== VisitStatus.Canceled) {
            return VisitStatus.Completed;
        }
        return visit.status;
    };

    const filteredVisits = useMemo(() => {
        let tempVisits = [...visits];

        // 1. Role-based filtering
        if (user?.role === Role.Doctor && user.doctor_id) {
            // A doctor should see visits from all clinics they are assigned to.
            const doctorClinicIds = clinics
                .filter(c => c.doctor_id === user.doctor_id)
                .map(c => c.clinic_id);
            tempVisits = tempVisits.filter(visit => doctorClinicIds.includes(visit.clinic_id));
        }
        
        // 2. Clinic filter
        if (clinicFilter !== 'all') {
            tempVisits = tempVisits.filter(visit => visit.clinic_id === parseInt(clinicFilter));
        }

        // 3. Status filter
        if (statusFilter !== 'all') {
            tempVisits = tempVisits.filter(visit => getEffectiveStatus(visit) === statusFilter);
        }

        // 4. Date range filter
        if (startDate) {
            tempVisits = tempVisits.filter(visit => visit.visit_date && visit.visit_date >= startDate);
        }
        if (endDate) {
            tempVisits = tempVisits.filter(visit => visit.visit_date && visit.visit_date <= endDate);
        }

        // Sort by most recent visit date
        return tempVisits.sort((a, b) => {
            const dateA = new Date(a.visit_date).getTime();
            const dateB = new Date(b.visit_date).getTime();
            if (isNaN(dateA)) return 1; // push invalid dates to the end
            if (isNaN(dateB)) return -1;
            return dateB - a.queue_number - (dateA - b.queue_number);
        });

    }, [visits, user, clinicFilter, statusFilter, startDate, endDate, diagnoses, clinics]);

    // Reset page to 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [clinicFilter, statusFilter, startDate, endDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVisits = filteredVisits.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };
    
    const pastDiagnosesForSelectedPatient = useMemo(() => {
        if (!selectedPatientForHistory) return [];

        const patientVisits = visits.filter(v => v.patient_id === selectedPatientForHistory.patient_id);
        const patientVisitIds = patientVisits.map(v => v.visit_id);

        const patientDiagnoses = diagnoses.filter(d => patientVisitIds.includes(d.visit_id));

        return patientDiagnoses.map(diag => {
            const visit = patientVisits.find(v => v.visit_id === diag.visit_id);
            return {
                ...diag,
                visit_date: visit?.visit_date || 'N/A'
            };
        }).sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    }, [selectedPatientForHistory, visits, diagnoses]);

    const resetFilters = () => {
        setClinicFilter('all');
        setStatusFilter('all');
        setStartDate('');
        setEndDate('');
    };

    const openDiagnosisModal = (visit: Visit) => {
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        setSelectedPatientForHistory(patient || null);
        setSelectedVisit(visit.visit_id);
        setNewDiagnosis({
            visit_id: visit.visit_id,
            doctor: user?.username || 'Manager',
            diagnosis: '',
            prescription: '',
            labs_needed: [],
            notes: ''
        });
        updateVisitStatus(visit.visit_id, VisitStatus.InProgress);
        setDiagnosisModalOpen(true);
    };

    const handleCloseDiagnosisModal = () => {
        setDiagnosisModalOpen(false);
        setSelectedVisit(null);
        setSelectedPatientForHistory(null);
    }

    const handleAddDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        addDiagnosis(newDiagnosis);
        handleCloseDiagnosisModal();
    };

    const getPatientName = (id: number) => patients.find(p => p.patient_id === id)?.name || 'N/A';
    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';

    const getDoctorName = (clinicId: number): string => {
        const clinic = clinics.find(c => c.clinic_id === clinicId);
        if (clinic) {
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
            return doctor ? doctor.doctor_name : 'N/A';
        }
        return 'N/A';
    };

    const getStatusColor = (status: VisitStatus) => {
        switch (status) {
            case VisitStatus.Waiting: return 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
            case VisitStatus.InProgress: return 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
            case VisitStatus.Completed: return 'bg-green-200 text-green-800 dark:bg-green-900 dark:text-green-300';
            case VisitStatus.Canceled: return 'bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
        }
    }
    
    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, filteredVisits.length)} من أصل {filteredVisits.length} سجل
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
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">سجل الزيارات</h1>
            
            {/* Filters Section */}
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>تصفية حسب:</span>
                </div>
                 {user?.role !== Role.Doctor && (
                    <div>
                        <label htmlFor="clinic-filter" className="sr-only">العيادة</label>
                        <select
                            id="clinic-filter"
                            className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={clinicFilter}
                            onChange={e => setClinicFilter(e.target.value)}
                        >
                            <option value="all">كل العيادات</option>
                            {clinics.map(clinic => (
                                <option key={clinic.clinic_id} value={clinic.clinic_id}>{clinic.clinic_name}</option>
                            ))}
                        </select>
                    </div>
                 )}
                <div>
                    <label htmlFor="status-filter" className="sr-only">الحالة</label>
                    <select 
                        id="status-filter"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value)}
                    >
                        <option value="all">كل الحالات</option>
                        {Object.values(VisitStatus).map(status => (
                            <option key={status} value={status}>{translateVisitStatus(status)}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="start-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">من:</label>
                    <input 
                        type="date" 
                        id="start-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                    />
                </div>
                <div>
                    <label htmlFor="end-date" className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">إلى:</label>
                    <input 
                        type="date" 
                        id="end-date"
                        className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                    />
                </div>
                <button 
                    onClick={resetFilters} 
                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden lg:table-cell">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden sm:table-cell">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden sm:table-cell">الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden sm:table-cell">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden sm:table-cell">الوقت</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden lg:table-cell">رقم الانتظار</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300 hidden lg:table-cell">نوع الزيارة</th>
                            {(user?.role === Role.Manager || user?.role === Role.Doctor) && <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentVisits.map(visit => {
                            const hasDiagnosis = diagnoses.some(d => d.visit_id === visit.visit_id);
                            const effectiveStatus = getEffectiveStatus(visit);
                            return (
                                <tr key={visit.visit_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">{visit.visit_id}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-medium">{getPatientName(visit.patient_id)}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{getClinicName(visit.clinic_id)}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{getDoctorName(visit.clinic_id)}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{visit.visit_date}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{visit.visit_time || '—'}</td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">{visit.queue_number}</td>
                                    <td className="p-3">
                                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                                          {translateVisitStatus(effectiveStatus)}
                                      </span>
                                    </td>
                                    <td className="p-3 text-sm text-gray-700 dark:text-gray-300 hidden lg:table-cell">{visit.visit_type}</td>
                                    {(user?.role === Role.Manager || user?.role === Role.Doctor) && (
                                        <td className="p-3">
                                            <button
                                                onClick={() => openDiagnosisModal(visit)}
                                                className="bg-teal-500 text-white px-3 py-1 rounded-md text-sm hover:bg-teal-600 disabled:bg-gray-400 flex items-center"
                                                disabled={hasDiagnosis}
                                                title={hasDiagnosis ? "تم تسجيل التشخيص بالفعل" : "تسجيل تشخيص جديد"}
                                            >
                                                <PencilSquareIcon className="h-4 w-4 ml-1" />
                                                {hasDiagnosis ? 'تم التسجيل' : 'تسجيل'}
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

            <Modal title={`تسجيل تشخيص للزيارة #${selectedVisit}`} isOpen={isDiagnosisModalOpen} onClose={handleCloseDiagnosisModal}>
                 <div className="flex items-center gap-2 mb-4">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">المريض:</label>
                    <input type="text" value={selectedPatientForHistory?.name || ''} className="flex-grow p-2 border border-gray-300 rounded-lg bg-gray-100 dark:bg-gray-600 dark:border-gray-500" readOnly />
                    <button
                        type="button"
                        onClick={() => setPastDiagnosesModalOpen(true)}
                        className="p-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 flex-shrink-0"
                        title="عرض التشخيصات السابقة"
                    >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                    </button>
                </div>
                 <form onSubmit={handleAddDiagnosis} className="space-y-4">
                    <textarea placeholder="التشخيص" value={newDiagnosis.diagnosis} onChange={e => setNewDiagnosis({...newDiagnosis, diagnosis: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} required />
                    <textarea placeholder="الوصفة الطبية" value={newDiagnosis.prescription} onChange={e => setNewDiagnosis({...newDiagnosis, prescription: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={3} required />
                    <input type="text" placeholder="التحاليل والأشعة المطلوبة (افصل بينها بفاصلة)" onChange={e => setNewDiagnosis({...newDiagnosis, labs_needed: e.target.value.split(',')})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <textarea placeholder="ملاحظات إضافية" value={newDiagnosis.notes} onChange={e => setNewDiagnosis({...newDiagnosis, notes: e.target.value})} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" rows={2} />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600">حفظ التشخيص</button>
                </form>
            </Modal>
            
            <Modal title={`التشخيصات السابقة لـ: ${selectedPatientForHistory?.name}`} isOpen={isPastDiagnosesModalOpen} onClose={() => setPastDiagnosesModalOpen(false)}>
                <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    {pastDiagnosesForSelectedPatient.length > 0 ? (
                        pastDiagnosesForSelectedPatient.map(diag => (
                            <div key={diag.diagnosis_id} className="border dark:border-gray-700 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-bold text-md text-teal-700 dark:text-teal-400">تاريخ الزيارة: {diag.visit_date}</h4>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">بواسطة: {diag.doctor}</span>
                                </div>
                                <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                                <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                                {diag.labs_needed && diag.labs_needed.length > 0 && diag.labs_needed[0] && (
                                    <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>
                                )}
                                {diag.notes && <p className="text-sm text-gray-800 dark:text-gray-300"><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                            </div>
                        ))
                    ) : (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-4">لا توجد تشخيصات سابقة لهذا المريض.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
};

export default Visits;