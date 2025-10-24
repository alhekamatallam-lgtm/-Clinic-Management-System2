import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon, DocumentTextIcon, ChartBarIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { Visit, Patient, Clinic, Diagnosis, Doctor, Role } from '../types';

interface ReportData {
    visit: Visit;
    patient: Patient;
    clinic: Clinic;
    diagnosis: Diagnosis;
    doctor: Doctor;
}

const MedicalReport: React.FC = () => {
    const { user, users, visits, patients, clinics, diagnoses, doctors, clinicLogo, clinicStamp, reportTargetVisitId, setReportTargetVisitId } = useApp();
    
    // State for filters
    const [patientNameFilter, setPatientNameFilter] = useState<string>('');
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [doctorFilter, setDoctorFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    // State for the report to be printed
    const [reportData, setReportData] = useState<ReportData | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const visitsWithDiagnosis = useMemo(() => {
        const diagnosisVisitIds = new Set(diagnoses.map(d => d.visit_id));
        return visits.filter(v => diagnosisVisitIds.has(v.visit_id));
    }, [visits, diagnoses]);
    
    const filteredVisits = useMemo(() => {
        let tempVisits = [...visitsWithDiagnosis];

        // Role-based filtering for doctors to see patients from ALL their clinics
        if (user?.role === Role.Doctor && user.doctor_id) {
            const doctorClinicIds = clinics
                .filter(c => c.doctor_id === user.doctor_id)
                .map(c => c.clinic_id);
            tempVisits = tempVisits.filter(v => doctorClinicIds.includes(v.clinic_id));
        }

        // 1. Patient Name filter
        if (patientNameFilter) {
            const patientIds = patients
                .filter(p => p.name.toLowerCase().includes(patientNameFilter.toLowerCase()))
                .map(p => p.patient_id);
            tempVisits = tempVisits.filter(v => patientIds.includes(v.patient_id));
        }

        // 2. Clinic filter (only for non-doctors)
        if (user?.role !== Role.Doctor && clinicFilter !== 'all') {
            tempVisits = tempVisits.filter(v => v.clinic_id === parseInt(clinicFilter));
        }
        
        // 3. Doctor filter (only for non-doctors)
        if (user?.role !== Role.Doctor && doctorFilter !== 'all') {
            const selectedDoctorId = parseInt(doctorFilter);
            const doctorClinicIds = clinics
                .filter(c => c.doctor_id === selectedDoctorId)
                .map(c => c.clinic_id);
            tempVisits = tempVisits.filter(v => doctorClinicIds.includes(v.clinic_id));
        }

        // 4. Date range filter
        if (startDate) {
            tempVisits = tempVisits.filter(v => v.visit_date >= startDate);
        }
        if (endDate) {
            tempVisits = tempVisits.filter(v => v.visit_date <= endDate);
        }
        
        return tempVisits.sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

    }, [visitsWithDiagnosis, patients, clinics, patientNameFilter, clinicFilter, doctorFilter, startDate, endDate, user]);

    // This effect runs when the component mounts or when the target ID changes
    useEffect(() => {
        if (reportTargetVisitId) {
            const targetVisit = visits.find(v => v.visit_id === reportTargetVisitId);
            if (targetVisit) {
                handleGenerateReport(targetVisit);
            } else {
                // If the visit ID is invalid, clear it to avoid being stuck on a blank page
                console.error(`MedicalReport: Could not find visit with ID ${reportTargetVisitId}`);
                setReportTargetVisitId(null); 
            }
        }
    }, [reportTargetVisitId, visits]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [patientNameFilter, clinicFilter, doctorFilter, startDate, endDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredVisits.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentVisits = filteredVisits.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const resetFilters = () => {
        setPatientNameFilter('');
        setClinicFilter('all');
        setDoctorFilter('all');
        setStartDate('');
        setEndDate('');
    };
    
    const handleGenerateReport = (visit: Visit) => {
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        const clinic = clinics.find(c => c.clinic_id === visit.clinic_id);
        const diagnosis = diagnoses.find(d => d.visit_id === visit.visit_id);

        if (!diagnosis) return;

        const diagnosingUser = users.find(u => u.username === diagnosis.doctor);
        if (!diagnosingUser || !diagnosingUser.doctor_id) return;
        
        const doctor = doctors.find(doc => doc.doctor_id === diagnosingUser.doctor_id);

        if (patient && clinic && diagnosis && doctor) {
            setReportData({ visit, patient, clinic, diagnosis, doctor });
        } else {
            alert('لم يتم العثور على كافة البيانات المطلوبة لإنشاء التقرير.');
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleBackToSearch = () => {
        setReportData(null);
        setReportTargetVisitId(null); // Crucial: clear the target ID
    };

    const getPatientName = (id: number) => patients.find(p => p.patient_id === id)?.name || 'N/A';
    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';
    
    const getDoctorName = (visit: Visit) => {
        const diagnosis = diagnoses.find(d => d.visit_id === visit.visit_id);
        if (!diagnosis) return 'N/A';
        
        const doctorUser = users.find(u => u.username === diagnosis.doctor);
        return doctorUser?.Name || diagnosis.doctor; // Fallback to username
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 no-print">
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

    if (reportData) {
        return (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
                <div className="flex justify-between items-center mb-6 no-print">
                    <button onClick={handleBackToSearch} className="text-teal-600 dark:text-teal-400 hover:underline">
                        &larr; العودة للبحث
                    </button>
                    <button 
                        onClick={handlePrint} 
                        className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors"
                    >
                        <PrinterIcon className="h-5 w-5 ml-2" />
                        طباعة التقرير
                    </button>
                </div>

                {/* This is the printable component */}
                <div className="printable-medical-report font-serif bg-white text-black p-8 md:p-12 rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
                    {/* Header */}
                    <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">مستوصف الراجحي التكافلي</h1>
                            <p className="text-md text-gray-600">Al Rajhi Takaful Polyclinic</p>
                        </div>
                         {clinicLogo ? (
                            <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto object-contain" />
                         ) : (
                            <ChartBarIcon className="h-16 w-16 text-teal-600"/>
                         )}
                    </header>

                    <h2 className="text-center text-2xl font-bold mb-8 underline">تقرير طبي - Medical Report</h2>

                    {/* Patient & Visit Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8 text-lg">
                        <div className="border border-gray-300 p-4 rounded-md">
                            <h3 className="font-bold mb-2 border-b pb-1">معلومات المريض</h3>
                            <p><strong>اسم المريض:</strong> {reportData.patient.name}</p>
                            <p><strong>الرقم الطبي:</strong> {reportData.patient.patient_id}</p>
                            <p><strong>تاريخ الميلاد:</strong> {reportData.patient.dob}</p>
                        </div>
                         <div className="border border-gray-300 p-4 rounded-md">
                            <h3 className="font-bold mb-2 border-b pb-1">تفاصيل الزيارة</h3>
                            <p><strong>تاريخ الزيارة:</strong> {reportData.visit.visit_date}</p>
                            <p><strong>العيادة:</strong> {reportData.clinic.clinic_name}</p>
                            <p><strong>الطبيب المعالج:</strong> {reportData.doctor.doctor_name}</p>
                        </div>
                    </div>

                    {/* Diagnosis Section */}
                    <div className="mb-12">
                        <h3 className="text-xl font-bold mb-4 border-b-2 border-gray-800 pb-2">التشخيص الطبي</h3>
                        <div className="bg-gray-50 p-6 rounded-md space-y-4 text-lg">
                            <div>
                                <h4 className="font-bold text-gray-700">التشخيص (Diagnosis):</h4>
                                <p className="pr-4">{reportData.diagnosis.diagnosis}</p>
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-700">العلاج الموصوف (Prescription):</h4>
                                <p className="pr-4">{reportData.diagnosis.prescription}</p>
                            </div>
                            {reportData.diagnosis.labs_needed.length > 0 && reportData.diagnosis.labs_needed[0] &&
                                <div>
                                    <h4 className="font-bold text-gray-700">الفحوصات المطلوبة (Required Labs/Scans):</h4>
                                    <p className="pr-4">{reportData.diagnosis.labs_needed.join(', ')}</p>
                                </div>
                            }
                            {reportData.diagnosis.notes &&
                                <div>
                                    <h4 className="font-bold text-gray-700">ملاحظات الطبيب (Doctor's Notes):</h4>
                                    <p className="pr-4">{reportData.diagnosis.notes}</p>
                                </div>
                            }
                        </div>
                    </div>
                    
                    {/* Footer */}
                    <footer className="pt-16">
                        <div className="flex justify-around items-end">
                            <div className="text-center w-1/2">
                                <p className="font-bold mb-4">توقيع الطبيب المعالج</p>
                                {reportData.doctor.signature ? (
                                    <img src={reportData.doctor.signature} alt="توقيع الطبيب" className="h-16 mx-auto mb-2 object-contain" />
                                ) : (
                                    <div className="h-16 mb-2"></div> // Placeholder for spacing
                                )}
                                <p className="border-t-2 border-dotted border-gray-400 w-48 mx-auto"></p>
                            </div>
                            <div className="text-center w-1/2">
                                <p className="font-bold mb-4">ختم المستوصف</p>
                                {clinicStamp ? (
                                     <img src={clinicStamp} alt="ختم المستوصف" className="h-24 mx-auto object-contain" />
                                ) : (
                                     <div className="h-24 w-24 border-2 border-dashed rounded-full mx-auto flex items-center justify-center text-gray-400">
                                        <p className="text-xs">مكان الختم</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-8 text-center">هذا التقرير صادر من النظام الإلكتروني لمستوصف الراجحي التكافلي.</p>
                    </footer>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6">طباعة التقارير الطبية</h1>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>بحث عن زيارة:</span>
                </div>
                <input
                    type="text"
                    placeholder="ابحث باسم المريض..."
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={patientNameFilter}
                    onChange={e => setPatientNameFilter(e.target.value)}
                />
                {user?.role !== Role.Doctor && (
                    <>
                        <select
                            className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={clinicFilter}
                            onChange={e => setClinicFilter(e.target.value)}
                        >
                            <option value="all">كل العيادات</option>
                            {clinics.map(clinic => (
                                <option key={clinic.clinic_id} value={clinic.clinic_id}>{clinic.clinic_name}</option>
                            ))}
                        </select>
                        <select
                            className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            value={doctorFilter}
                            onChange={e => setDoctorFilter(e.target.value)}
                        >
                            <option value="all">كل الأطباء</option>
                            {doctors.map(doctor => (
                                <option key={doctor.doctor_id} value={doctor.doctor_id}>{doctor.doctor_name}</option>
                            ))}
                        </select>
                    </>
                )}
                <input 
                    type="date" 
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <input 
                    type="date" 
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
                <button 
                    onClick={resetFilters} 
                    className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">تاريخ الزيارة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">إجراء</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentVisits.length > 0 ? currentVisits.map(visit => (
                            <tr key={visit.visit_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3">{getPatientName(visit.patient_id)}</td>
                                <td className="p-3">{getClinicName(visit.clinic_id)}</td>
                                <td className="p-3">{getDoctorName(visit)}</td>
                                <td className="p-3">{visit.visit_date}</td>
                                <td className="p-3">
                                    <button
                                        onClick={() => handleGenerateReport(visit)}
                                        className="flex items-center bg-blue-500 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-600"
                                    >
                                        <DocumentTextIcon className="h-4 w-4 ml-1" />
                                        إنشاء تقرير
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={5} className="text-center p-4 text-gray-500 dark:text-gray-400">
                                    لا توجد زيارات مطابقة لمعايير البحث.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            <PaginationControls />
        </div>
    );
};

export default MedicalReport;
