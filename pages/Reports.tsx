import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { FunnelIcon, XMarkIcon, PrinterIcon, ChevronRightIcon, ChevronLeftIcon } from '@heroicons/react/24/solid';
import { VisitType, Role } from '../types';

const Reports: React.FC = () => {
    const { user, revenues, clinics, doctors, clinicLogo } = useApp();
    
    const [isPrinting, setIsPrinting] = useState(false);
    const [patientNameFilter, setPatientNameFilter] = useState<string>('');
    const [clinicFilter, setClinicFilter] = useState<string>('all');
    const [doctorFilter, setDoctorFilter] = useState<string>('all');
    const [visitTypeFilter, setVisitTypeFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;
    
    useEffect(() => {
        if (isPrinting) {
            const handleAfterPrint = () => setIsPrinting(false);
            window.addEventListener('afterprint', handleAfterPrint);
            window.print();
            return () => window.removeEventListener('afterprint', handleAfterPrint);
        }
    }, [isPrinting]);
    
    const filteredRevenues = useMemo(() => {
        let tempRevenues = [...revenues];
        if (user?.role === Role.Doctor && user.doctor_id) {
            const doctorClinicIds = clinics.filter(c => c.doctor_id === user.doctor_id).map(c => c.clinic_id);
            tempRevenues = tempRevenues.filter(r => doctorClinicIds.includes(r.clinic_id));
        }
        if (patientNameFilter) {
            tempRevenues = tempRevenues.filter(r => r.patient_name.toLowerCase().includes(patientNameFilter.toLowerCase()));
        }
        if (user?.role !== Role.Doctor && clinicFilter !== 'all') {
            tempRevenues = tempRevenues.filter(r => r.clinic_id === parseInt(clinicFilter));
        }
        if (user?.role !== Role.Doctor && doctorFilter !== 'all') {
            const selectedDoctorId = parseInt(doctorFilter);
            tempRevenues = tempRevenues.filter(r => {
                const clinic = clinics.find(c => c.clinic_id === r.clinic_id);
                return clinic && clinic.doctor_id === selectedDoctorId;
            });
        }
        if (visitTypeFilter !== 'all') {
            tempRevenues = tempRevenues.filter(r => r.type === visitTypeFilter);
        }
        if (startDate) {
            tempRevenues = tempRevenues.filter(r => r.date >= startDate);
        }
        if (endDate) {
            tempRevenues = tempRevenues.filter(r => r.date <= endDate);
        }
        return tempRevenues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [revenues, clinics, doctors, user, patientNameFilter, clinicFilter, doctorFilter, visitTypeFilter, startDate, endDate]);

    useEffect(() => {
        setCurrentPage(1);
    }, [patientNameFilter, clinicFilter, doctorFilter, visitTypeFilter, startDate, endDate]);

    const totalPages = Math.ceil(filteredRevenues.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentRevenues = filteredRevenues.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const totalFilteredAmount = useMemo(() => {
        return filteredRevenues.reduce((sum, r) => sum + r.amount, 0);
    }, [filteredRevenues]);

    const resetFilters = () => {
        setPatientNameFilter('');
        setClinicFilter('all');
        setDoctorFilter('all');
        setVisitTypeFilter('all');
        setStartDate('');
        setEndDate('');
    };
    
    const handlePrint = () => {
        setIsPrinting(true);
    };

    const getClinicName = (id: number) => clinics.find(c => c.clinic_id === id)?.clinic_name || 'N/A';
    
    const getDoctorName = (clinicId: number): string => {
        const clinic = clinics.find(c => c.clinic_id === clinicId);
        if (clinic) {
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
            return doctor ? doctor.doctor_name : 'N/A';
        }
        return 'N/A';
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4 no-print">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, filteredRevenues.length)} من أصل {filteredRevenues.length} سجل
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
    
    const PrintableContent = () => (
         <div className="bg-white text-black p-6">
            <div className="text-center mb-6">
                {clinicLogo && <img src={clinicLogo} alt="شعار المستوصف" className="h-20 w-auto mx-auto mb-4 object-contain" />}
                <h1 className="text-2xl font-bold text-black">تقرير الإيرادات</h1>
                {(startDate || endDate) && <p className="text-lg text-gray-700">للفترة من {startDate || '...'} إلى {endDate || '...'}</p>}
             </div>
            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">اسم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide">نوع الزيارة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredRevenues.map(revenue => (
                            <tr key={revenue.revenue_id}>
                                <td className="p-3 text-sm">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm">{revenue.patient_name}</td>
                                <td className="p-3 text-sm">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm">{getDoctorName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm">{revenue.date}</td>
                                <td className="p-3 text-sm">{revenue.type}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100">
                        <tr>
                            <td colSpan={4} className="p-3 text-sm font-bold text-left">الإجمالي</td>
                            <td colSpan={3} className="p-3 text-sm font-bold text-teal-700 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );

    if (isPrinting) {
        return <PrintableContent />;
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">تقارير الإيرادات</h1>
                <button onClick={handlePrint} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors">
                    <PrinterIcon className="h-5 w-5 ml-2" />
                    طباعة
                </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900/50 p-4 rounded-lg mb-6 flex flex-wrap items-center gap-4 no-print">
                <div className="flex items-center text-gray-600 dark:text-gray-300 font-semibold">
                    <FunnelIcon className="h-5 w-5 ml-2 text-gray-400 dark:text-gray-500" />
                    <span>تصفية حسب:</span>
                </div>
                <input
                    type="text"
                    id="patient-name-filter"
                    placeholder="ابحث باسم المريض..."
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={patientNameFilter}
                    onChange={e => setPatientNameFilter(e.target.value)}
                />
                 {user?.role !== Role.Doctor && (
                    <>
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
                        <select
                            id="doctor-filter"
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
                <select
                    id="visit-type-filter"
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={visitTypeFilter}
                    onChange={e => setVisitTypeFilter(e.target.value)}
                >
                    <option value="all">كل الأنواع</option>
                    <option value={VisitType.FirstVisit}>{VisitType.FirstVisit}</option>
                    <option value={VisitType.FollowUp}>{VisitType.FollowUp}</option>
                </select>
                <input 
                    type="date" 
                    id="start-date"
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={startDate}
                    onChange={e => setStartDate(e.target.value)}
                />
                <input 
                    type="date" 
                    id="end-date"
                    className="p-2 border border-gray-300 rounded-md focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    value={endDate}
                    onChange={e => setEndDate(e.target.value)}
                />
                <button onClick={resetFilters} className="flex items-center bg-gray-200 text-gray-700 px-3 py-2 rounded-md hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                    <XMarkIcon className="h-4 w-4 ml-1" />
                    مسح
                </button>
            </div>


            <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">#</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم المريض</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">العيادة</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">اسم الطبيب</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">المبلغ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">التاريخ</th>
                            <th className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">نوع الزيارة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {currentRevenues.map(revenue => (
                            <tr key={revenue.revenue_id}>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.revenue_id}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.patient_name}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getClinicName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{getDoctorName(revenue.clinic_id)}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300 font-bold">{revenue.amount} ريال</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.date}</td>
                                <td className="p-3 text-sm text-gray-700 dark:text-gray-300">{revenue.type}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            <td colSpan={4} className="p-3 text-sm font-bold text-gray-800 dark:text-gray-200 text-left">الإجمالي</td>
                            <td colSpan={3} className="p-3 text-sm font-bold text-teal-700 dark:text-teal-400 text-right">{totalFilteredAmount.toFixed(2)} ريال</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <PaginationControls />
        </div>
    );
};

export default Reports;