import React, { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { VisitStatus, Diagnosis, Visit, Patient } from '../../types';
import Modal from '../ui/Modal';
import StatCard from '../ui/StatCard';
import { UserGroupIcon, CheckCircleIcon, CurrencyDollarIcon, PencilSquareIcon, ClipboardDocumentListIcon } from '@heroicons/react/24/solid';

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


const DoctorDashboard: React.FC = () => {
    const { user, visits, patients, diagnoses, addDiagnosis, updateVisitStatus, revenues, clinics } = useApp();
    const [selectedVisitId, setSelectedVisitId] = useState<number | null>(null);
    const [isDiagnosisModalOpen, setDiagnosisModalOpen] = useState(false);
    const [isPastDiagnosesModalOpen, setPastDiagnosesModalOpen] = useState(false);
    const [selectedPatientForModal, setSelectedPatientForModal] = useState<Patient | null>(null);

    const [newDiagnosis, setNewDiagnosis] = useState<Omit<Diagnosis, 'diagnosis_id'>>({
        visit_id: 0,
        doctor: user?.username || '',
        diagnosis: '',
        prescription: '',
        labs_needed: [],
        notes: ''
    });

    if (!user || user.role !== 'doctor' || !user.doctor_id) {
        return <div> وصول غير مصرح به </div>;
    }

    const today = getLocalYYYYMMDD(new Date());
    const doctorId = user.doctor_id;

    const myClinicIds = useMemo(() => 
        clinics.filter(c => c.doctor_id === doctorId).map(c => c.clinic_id),
        [clinics, doctorId]
    );

    const hasDiagnosis = (visitId: number) => diagnoses.some(d => d.visit_id === visitId);

    const getEffectiveStatus = (visit: Visit): VisitStatus => {
        if (hasDiagnosis(visit.visit_id) && visit.status !== VisitStatus.Canceled) {
            return VisitStatus.Completed;
        }
        return visit.status;
    };

    const myVisitsToday = visits.filter(v => 
        myClinicIds.includes(v.clinic_id) && v.visit_date === today
    ).sort((a,b) => a.queue_number - b.queue_number);

    // Split visits into waiting and completed lists based on the effective status
    const waitingVisits = myVisitsToday.filter(v => {
        const status = getEffectiveStatus(v);
        return status === VisitStatus.Waiting || status === VisitStatus.InProgress;
    });

    const completedVisits = myVisitsToday.filter(v => {
        const status = getEffectiveStatus(v);
        return status === VisitStatus.Completed || status === VisitStatus.Canceled;
    });
    
    const todaysRevenue = revenues
        .filter(r => myClinicIds.includes(r.clinic_id) && r.date === today)
        .reduce((sum, r) => sum + r.amount, 0);

    const openDiagnosisModal = (visit: Visit) => {
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        setSelectedPatientForModal(patient || null);
        setSelectedVisitId(visit.visit_id);
        setNewDiagnosis({
            visit_id: visit.visit_id,
            doctor: user?.username || '',
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
        setSelectedVisitId(null);
        setSelectedPatientForModal(null);
        setPastDiagnosesModalOpen(false); // Also close the history modal if open
    };

    const handleAddDiagnosis = (e: React.FormEvent) => {
        e.preventDefault();
        addDiagnosis(newDiagnosis);
        handleCloseDiagnosisModal();
    };
    
    const pastDiagnosesForSelectedPatient = useMemo(() => {
        if (!selectedPatientForModal) return [];

        const patientVisits = visits.filter(v => v.patient_id === selectedPatientForModal.patient_id);
        const patientVisitIds = patientVisits.map(v => v.visit_id);

        const patientDiagnoses = diagnoses.filter(d => patientVisitIds.includes(d.visit_id));

        return patientDiagnoses.map(diag => {
            const visit = patientVisits.find(v => v.visit_id === diag.visit_id);
            return {
                ...diag,
                visit_date: visit?.visit_date || 'N/A'
            };
        }).sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());
    }, [selectedPatientForModal, visits, diagnoses]);


    const getPatientName = (patientId: number) => {
        return patients.find(p => p.patient_id === patientId)?.name || 'غير معروف';
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

    const VisitRow: React.FC<{visit: Visit, queuePosition: React.ReactNode, isWaiting: boolean}> = ({ visit, queuePosition, isWaiting }) => {
        const effectiveStatus = getEffectiveStatus(visit);
        return (
            <tr className={`border-b dark:border-gray-700 ${!isWaiting ? 'bg-gray-50 dark:bg-gray-800/60 opacity-60' : ''}`}>
                <td className="p-3 font-bold text-teal-800 dark:text-teal-300">{queuePosition}</td>
                <td className="p-3 font-medium text-gray-800 dark:text-gray-200">{getPatientName(visit.patient_id)}</td>
                <td className="p-3 text-sm text-gray-500 dark:text-gray-400">{visit.visit_time || '—'}</td>
                <td className="p-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(effectiveStatus)}`}>
                        {translateVisitStatus(effectiveStatus)}
                    </span>
                </td>
                <td className="p-3">
                     <button 
                        onClick={() => openDiagnosisModal(visit)} 
                        className="bg-teal-500 text-white px-3 py-1 rounded-md text-sm hover:bg-teal-600 disabled:bg-gray-400 flex items-center"
                        disabled={!isWaiting}
                    >
                      <PencilSquareIcon className="h-4 w-4 ml-1" />
                      {hasDiagnosis(visit.visit_id) ? 'عرض التشخيص' : 'تسجيل التشخيص'}
                    </button>
                </td>
            </tr>
        );
    };

    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="إجمالي مرضى اليوم" value={myVisitsToday.length} icon={UserGroupIcon} color="bg-blue-500" />
                <StatCard title="المرضى المتبقين" value={waitingVisits.length} icon={UserGroupIcon} color="bg-yellow-500" />
                <StatCard title="إيرادات اليوم" value={`${todaysRevenue} ريال`} icon={CurrencyDollarIcon} color="bg-indigo-500" />
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <h2 className="text-xl font-bold text-teal-800 dark:text-teal-300 mb-4">قائمة مرضى اليوم</h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">رقم الانتظار</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الوقت</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">الحالة</th>
                                <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">إجراء</th>
                            </tr>
                        </thead>
                        {/* Wating List Body */}
                        {waitingVisits.length > 0 && (
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                <tr className="bg-teal-50 dark:bg-teal-900/50">
                                    <td colSpan={5} className="p-2 text-center font-bold text-teal-800 dark:text-teal-300">قائمة الانتظار الحالية</td>
                                </tr>
                                {waitingVisits.map((visit, index) => (
                                    <VisitRow key={visit.visit_id} visit={visit} queuePosition={index + 1} isWaiting={true} />
                                ))}
                            </tbody>
                        )}
                        {/* Completed List Body */}
                        {completedVisits.length > 0 && (
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                <tr className="bg-gray-100 dark:bg-gray-700">
                                    <td colSpan={5} className="p-2 text-center font-bold text-gray-600 dark:text-gray-300">الزيارات المكتملة</td>
                                </tr>
                                {completedVisits.map((visit) => (
                                    <VisitRow key={visit.visit_id} visit={visit} queuePosition={<CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />} isWaiting={false} />
                                ))}
                            </tbody>
                        )}
                    </table>
                </div>
            </div>

            <Modal title={`تسجيل تشخيص لـ: ${selectedPatientForModal?.name}`} isOpen={isDiagnosisModalOpen} onClose={handleCloseDiagnosisModal}>
                 <div className="mb-4">
                    <button
                        type="button"
                        onClick={() => setPastDiagnosesModalOpen(true)}
                        className="w-full flex items-center justify-center gap-2 p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                    >
                        <ClipboardDocumentListIcon className="h-5 w-5" />
                        <span>عرض التشخيصات السابقة للمريض</span>
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
            
            <Modal title={`التشخيصات السابقة لـ: ${selectedPatientForModal?.name}`} isOpen={isPastDiagnosesModalOpen} onClose={() => setPastDiagnosesModalOpen(false)}>
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

export default DoctorDashboard;