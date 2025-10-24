import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { VisitStatus, Role, Diagnosis, Visit, Patient } from '../types';
import { PlusCircleIcon, PencilSquareIcon, ClipboardDocumentListIcon, ArrowRightOnRectangleIcon } from '@heroicons/react/24/solid';
import Modal from '../components/ui/Modal';


// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const translateVisitStatus = (status: VisitStatus): string => {
    switch (status) {
        case VisitStatus.Waiting: return 'في الانتظار';
        case VisitStatus.InProgress: return 'قيد المعالجة';
        case VisitStatus.Completed: return 'مكتمل';
        case VisitStatus.Canceled: return 'ملغى';
        default: return status;
    }
};

const Queue: React.FC = () => {
    const { user, visits, patients, clinics, diagnoses, setView, addDiagnosis, updateVisitStatus, logout } = useApp();

    // State for modals
    const [isDiagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
    const [isPastDiagnosesModalOpen, setPastDiagnosesModalOpen] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
    const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<Patient | null>(null);

    const [newDiagnosis, setNewDiagnosis] = useState<Omit<Diagnosis, 'diagnosis_id'>>({
        visit_id: 0,
        doctor: user?.username || 'N/A',
        diagnosis: '',
        prescription: '',
        labs_needed: [],
        notes: ''
    });


    const today = getLocalYYYYMMDD(new Date());
    
    const getEffectiveStatus = (visit: Visit): VisitStatus => {
        const isDiagnosed = diagnoses.some(d => d.visit_id === visit.visit_id);
        if (isDiagnosed && visit.status !== VisitStatus.Canceled) {
            return VisitStatus.Completed;
        }
        return visit.status;
    };

    const waitingVisits = visits
        .filter(v => {
            const isToday = v.visit_date === today;
            if (!isToday) {
                return false;
            }

            const effectiveStatus = getEffectiveStatus(v);
            if (effectiveStatus !== VisitStatus.Waiting && effectiveStatus !== VisitStatus.InProgress) {
                 return false;
            }
            
            // Role-specific filtering (for doctors viewing their own queue)
            if (user?.role === Role.Doctor) {
                const clinicForVisit = clinics.find(c => c.clinic_id === v.clinic_id);
                return clinicForVisit && clinicForVisit.doctor_id === user.doctor_id;
            }
            
            return true; // For receptionists/managers, show all clinics
        })
        .sort((a, b) => a.queue_number - b.queue_number);

    // Group visits by clinic
    const visitsByClinic = waitingVisits.reduce((acc, visit) => {
        const clinicName = clinics.find(c => c.clinic_id === visit.clinic_id)?.clinic_name || 'عيادة غير معروفة';
        if (!acc[clinicName]) {
            acc[clinicName] = [];
        }
        acc[clinicName].push(visit);
        return acc;
    }, {} as Record<string, typeof waitingVisits>);

    const getPatientName = (patientId: number) => {
        return patients.find(p => p.patient_id === patientId)?.name || 'غير معروف';
    };

    const openDiagnosisModal = (visit: Visit) => {
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        setSelectedVisit(visit);
        setSelectedPatientForHistory(patient || null);
        setNewDiagnosis({
            visit_id: visit.visit_id,
            doctor: user?.username || 'N/A',
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
    };

    const handleAddDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        addDiagnosis(newDiagnosis);
        handleCloseDiagnosisModal();
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


    return (
        <div className="relative min-h-screen bg-gray-100 dark:bg-gray-900 p-4 sm:p-6 lg:p-8">
            {user?.role === Role.QueueScreen && (
                <button
                    onClick={logout}
                    className="no-print absolute top-4 left-4 z-10 flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-300 transition-colors shadow-md dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    title="تسجيل الخروج"
                >
                    <ArrowRightOnRectangleIcon className="h-5 w-5 ml-2" />
                    <span>خروج</span>
                </button>
            )}

            <div className="flex justify-between items-center mb-8 no-print">
                <h1 className="text-4xl font-bold text-amber-800 dark:text-amber-300">شاشة الانتظار</h1>
                 {(user?.role === Role.Reception || user?.role === Role.Manager) && (
                    <button
                        onClick={() => setView('dashboard')}
                        className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors shadow-md"
                    >
                        <PlusCircleIcon className="h-6 w-6 ml-2"/>
                        <span>تسجيل زيارة جديدة</span>
                    </button>
                )}
            </div>
            {Object.keys(visitsByClinic).length === 0 ? (
                <div className="text-center text-gray-500 dark:text-gray-400 text-xl bg-amber-50 dark:bg-gray-800 p-10 rounded-lg shadow-md">
                    <p>لا يوجد مرضى في قائمة الانتظار حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {Object.entries(visitsByClinic).map(([clinicName, clinicVisits]) => (
                        <div key={clinicName} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
                            <h2 className="text-2xl font-bold text-amber-700 dark:text-amber-400 mb-4 border-b-2 pb-2 border-amber-200 dark:border-amber-700">{clinicName}</h2>
                            <ul className="space-y-4">
                                {clinicVisits.map((visit) => (
                                    <li key={visit.visit_id} className={`p-4 rounded-lg flex flex-col items-start ${visit.status === VisitStatus.InProgress ? 'bg-blue-100 dark:bg-blue-900/50 border-l-4 border-blue-500 dark:border-blue-400' : 'bg-amber-100 dark:bg-amber-900/50 border-l-4 border-amber-500 dark:border-amber-400'}`}>
                                        <div className="w-full flex items-center justify-between">
                                            <div>
                                                <p className="text-2xl font-bold text-amber-800 dark:text-amber-300">{visit.queue_number}</p>
                                                <p className="text-lg text-gray-600 dark:text-gray-300">{getPatientName(visit.patient_id)}</p>
                                            </div>
                                            <span className={`px-3 py-1 text-sm font-semibold rounded-full ${visit.status === VisitStatus.InProgress ? 'bg-blue-200 text-blue-800 dark:bg-blue-900 dark:text-blue-300' : 'bg-yellow-200 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                                {translateVisitStatus(visit.status)}
                                            </span>
                                        </div>
                                         {(user?.role === Role.Doctor || user?.role === Role.Manager) && (
                                            <div className="mt-4 w-full">
                                                <button
                                                    onClick={() => openDiagnosisModal(visit)}
                                                    className="w-full flex items-center justify-center bg-teal-500 text-white px-3 py-2 rounded-md text-sm hover:bg-teal-600 transition-colors"
                                                >
                                                    <PencilSquareIcon className="h-4 w-4 ml-2" />
                                                    تسجيل الكشف
                                                </button>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            )}

            <Modal title={`تسجيل تشخيص للزيارة #${selectedVisit?.visit_id}`} isOpen={isDiagnosisModalOpen} onClose={handleCloseDiagnosisModal}>
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

export default Queue;