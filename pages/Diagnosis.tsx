import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { ChevronRightIcon, ChevronLeftIcon, MagnifyingGlassIcon } from '@heroicons/react/24/solid';


const Diagnosis: React.FC = () => {
    const { diagnoses, visits, patients } = useApp();

    // Search and Pagination state
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    const filteredDiagnoses = useMemo(() => {
        let results = diagnoses;

        if (searchTerm) {
            const lowercasedSearchTerm = searchTerm.toLowerCase();
            results = results.filter(diag => {
                const visit = visits.find(v => v.visit_id === diag.visit_id);
                if (!visit) return false;
                
                const patient = patients.find(p => p.patient_id === visit.patient_id);
                if (!patient) return false;
                
                return patient.name.toLowerCase().includes(lowercasedSearchTerm);
            });
        }

        // Sort by date descending
        return results.sort((a, b) => {
            const visitA = visits.find(v => v.visit_id === a.visit_id);
            const visitB = visits.find(v => v.visit_id === b.visit_id);
            if (!visitA || !visitA.visit_date) return 1;
            if (!visitB || !visitB.visit_date) return -1;
            
            const dateA = new Date(visitA.visit_date).getTime();
            const dateB = new Date(visitB.visit_date).getTime();
            
            return dateB - dateA;
        });
    }, [diagnoses, visits, patients, searchTerm]);

    // Reset page to 1 when search term changes
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredDiagnoses.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentDiagnoses = filteredDiagnoses.slice(indexOfFirstItem, indexOfLastItem);

    const handlePageChange = (pageNumber: number) => {
        if (pageNumber < 1 || pageNumber > totalPages) return;
        setCurrentPage(pageNumber);
    };

    const getVisitInfo = (visitId: number) => {
        const visit = visits.find(v => v.visit_id === visitId);
        if (!visit) return { patientName: 'N/A', visitDate: 'N/A' };
        const patient = patients.find(p => p.patient_id === visit.patient_id);
        return {
            patientName: patient?.name || 'N/A',
            visitDate: visit.visit_date
        };
    };

    const PaginationControls = () => {
        if (totalPages <= 1) return null;
        return (
            <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
                <span className="text-sm text-gray-700 dark:text-gray-400">
                    عرض {indexOfFirstItem + 1} إلى {Math.min(indexOfLastItem, filteredDiagnoses.length)} من أصل {filteredDiagnoses.length} سجل
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
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">سجل التشخيصات</h1>
                <div className="relative w-full sm:w-auto">
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                    </span>
                    <input
                        type="text"
                        placeholder="ابحث باسم المريض..."
                        className="w-full sm:w-64 p-2 pr-10 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            {currentDiagnoses.length > 0 ? (
                <div className="space-y-4">
                    {currentDiagnoses.map(diag => {
                        const { patientName, visitDate } = getVisitInfo(diag.visit_id);
                        return (
                            <div key={diag.diagnosis_id} className="border dark:border-gray-700 p-4 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="font-bold text-lg text-teal-700 dark:text-teal-400">{patientName}</h3>
                                    <span className="text-sm text-gray-500 dark:text-gray-400">{visitDate}</span>
                                </div>
                                <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">التشخيص:</span> {diag.diagnosis}</p>
                                <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">الوصفة:</span> {diag.prescription}</p>
                                {diag.labs_needed && diag.labs_needed.length > 0 && diag.labs_needed[0] && (
                                    <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">المطلوب:</span> {diag.labs_needed.join(', ')}</p>
                                )}
                                {diag.notes && <p className="text-gray-800 dark:text-gray-300"><span className="font-semibold">ملاحظات:</span> {diag.notes}</p>}
                            </div>
                        );
                    })}
                </div>
             ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>لا توجد تشخيصات مطابقة لمعايير البحث.</p>
                </div>
            )}
            <PaginationControls />
        </div>
    );
};

export default Diagnosis;