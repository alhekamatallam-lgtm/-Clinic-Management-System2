import React, { createContext, useState, useContext, useEffect, ReactNode, useRef } from 'react';
import { Patient, Visit, Diagnosis, User, Clinic, Revenue, Role, View, VisitStatus, VisitType, Doctor, Optimization, Disbursement, DisbursementStatus, DisbursementType, PaymentVoucher, PaymentVoucherStatus, PaymentMethod } from '../types';

// The API URL provided by the user.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwSSTI-9CZ6oq1q3jkbv8T3mav94cJbXSA1qYvqh9khLcwPhmROz_k4saNEKMhirf4E/exec"; 

// Backend column mapping, used to parse array responses from the API
const COLUMN_MAPPING = {
    Patients: ['patient_id','name','dob','gender','phone','address'],
    Visits: ['visit_id','patient_id','clinic_id','visit_date','queue_number','status','visit_type','visit_time'],
    Diagnosis: ['diagnosis_id','visit_id','doctor','diagnosis','prescription','labs_needed','notes'],
    Revenues: ['revenue_id','visit_id','patient_id','patient_name','clinic_id','amount','date','type','notes'],
    Users: ['user_id', 'username', 'password', 'role', 'clinic_id', 'clinic', 'doctor_id', 'doctor_name', 'Name', 'status'],
    Doctors: ['doctor_id', 'doctor_name', 'specialty', 'clinic_id', 'phone', 'email', 'shift', 'status', 'signature'],
    Clinics: ['clinic_id', 'clinic_name', 'doctor_id', 'doctor_name', 'max_patients_per_day', 'price_first_visit', 'price_followup', 'shift', 'notes'],
    Settings: ['logo', 'stamp', 'signature'],
    Optimization: ['optimization_id', 'user', 'name', 'page', 'optimize'],
    // Disbursement & PaymentVoucher mappings are now handled manually in fetchData to align with Arabic keys from the API.
};

// Helper function to format dates consistently to 'YYYY-MM-DD' in the local timezone.
const formatDateToLocalYYYYMMDD = (dateInput: string | Date | undefined | null): string => {
    if (!dateInput) return '';
    try {
        const date = new Date(dateInput);
        // Check for invalid date
        if (isNaN(date.getTime())) return '';
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}-${month}-${day}`;
    } catch (e) {
        // Return empty string if date parsing fails
        return '';
    }
};

// Helper function to convert the array returned by the POST request into a structured object.
// This allows for immediate UI updates with server-generated data (like IDs).
const mapRowToObject = <T,>(row: any[], sheetName: keyof typeof COLUMN_MAPPING): T => {
    const keys = COLUMN_MAPPING[sheetName];
    const obj: { [key: string]: any } = {};
    keys.forEach((key, index) => {
        const value = row[index];
        // Coerce IDs and numeric fields to numbers for type consistency.
        if (key.endsWith('_id') || ['queue_number', 'amount', 'price_first_visit', 'price_followup', 'max_patients_per_day'].includes(key)) {
            obj[key] = Number(value) || 0;
        } 
        // Convert comma-separated strings for labs_needed back into an array.
        else if (key === 'labs_needed' && typeof value === 'string') {
            obj[key] = value.split(',').filter(l => l && l.trim() !== '');
        }
        else {
            obj[key] = value;
        }
    });
    return obj as T;
};

interface AppContextType {
    user: User | null;
    login: (username: string, password?: string, rememberMe?: boolean) => { success: boolean, error?: string };
    logout: () => void;
    currentView: View;
    setView: (view: View) => void;
    patients: Patient[];
    visits: Visit[];
    diagnoses: Diagnosis[];
    users: User[];
    clinics: Clinic[];
    revenues: Revenue[];
    doctors: Doctor[];
    optimizations: Optimization[];
    disbursements: Disbursement[];
    paymentVouchers: PaymentVoucher[];
    addPatient: (patient: Omit<Patient, 'patient_id'>) => Promise<void>;
    addVisit: (visit: Omit<Visit, 'visit_id' | 'queue_number' | 'status'>) => Promise<Visit>;
    addDiagnosis: (diagnosis: Omit<Diagnosis, 'diagnosis_id'>) => Promise<void>;
    addManualRevenue: (revenue: Omit<Revenue, 'revenue_id'>) => Promise<boolean>;
    addDoctor: (doctor: Omit<Doctor, 'doctor_id'>) => Promise<void>;
    addClinic: (clinic: Omit<Clinic, 'clinic_id' | 'doctor_name'>) => Promise<void>;
    addOptimization: (suggestion: Omit<Optimization, 'optimization_id'>) => Promise<void>;
    addDisbursement: (disbursement: Omit<Disbursement, 'disbursement_id' | 'status'>) => Promise<void>;
    updateDisbursementStatus: (disbursementId: number, status: DisbursementStatus) => Promise<void>;
    addPaymentVoucher: (voucher: Omit<PaymentVoucher, 'voucher_id' | 'status'>) => Promise<void>;
    updatePaymentVoucherStatus: (voucherId: number, status: PaymentVoucherStatus) => Promise<void>;
    updateClinic: (clinicId: number, clinicData: Partial<Omit<Clinic, 'clinic_id'>>) => Promise<void>;
    deleteClinic: (clinicId: number) => Promise<void>;
    updateVisitStatus: (visitId: number, status: VisitStatus) => void; 
    addUser: (user: Omit<User, 'user_id'>) => Promise<void>;
    updateUser: (userId: number, userData: Partial<Omit<User, 'user_id'>>) => Promise<void>;
    deleteUser: (userId: number) => Promise<void>;
    isAdding: boolean;
    isAddingVisit: boolean;
    loading: boolean;
    isSyncing: boolean;
    error: string | null;
    notification: { message: string; type: 'success' | 'error' } | null;
    showNotification: (message: string, type?: 'success' | 'error') => void;
    hideNotification: () => void;
    isSidebarOpen: boolean;
    toggleSidebar: () => void;
    clinicLogo: string | null;
    clinicStamp: string | null;
    clinicSignature: string | null;
    settings: { [key: string]: string };
    updateSettings: (settings: { [key: string]: string }) => Promise<void>;
    reportTargetVisitId: number | null;
    setReportTargetVisitId: (visitId: number | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Initialize user state from localStorage to persist session
    const [user, setUser] = useState<User | null>(() => {
        try {
            const storedUser = localStorage.getItem('clinicUser');
            return storedUser ? JSON.parse(storedUser) : null;
        } catch (error) {
            console.error('Failed to parse user from localStorage', error);
            return null;
        }
    });

    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
    
    // Settings state, loaded from backend
    const [settings, setSettings] = useState<{ [key: string]: string }>(() => {
        try {
            const storedSettings = localStorage.getItem('clinicSettings');
            return storedSettings ? JSON.parse(storedSettings) : {};
        } catch (error) {
            console.error('Failed to parse settings from localStorage', error);
            return {};
        }
    });
    const [reportTargetVisitId, setReportTargetVisitIdState] = useState<number | null>(null);

    const toggleSidebar = () => {
        setIsSidebarOpen(prev => !prev);
    };

    // Data states
    const [patients, setPatients] = useState<Patient[]>([]);
    const [visits, setVisits] = useState<Visit[]>([]);
    const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [revenues, setRevenues] = useState<Revenue[]>([]);
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [optimizations, setOptimizations] = useState<Optimization[]>([]);
    const [disbursements, setDisbursements] = useState<Disbursement[]>([]);
    const [paymentVouchers, setPaymentVouchers] = useState<PaymentVoucher[]>([]);


    // API states
    const [loading, setLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingVisit, setIsAddingVisit] = useState(false);

    // Notification State
    const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const notificationTimer = useRef<number | null>(null);

    const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
        if (notificationTimer.current) {
            clearTimeout(notificationTimer.current);
        }
        setNotification({ message, type });
        notificationTimer.current = window.setTimeout(() => {
            setNotification(null);
        }, 3000);
    };

    const hideNotification = () => {
        if (notificationTimer.current) {
            clearTimeout(notificationTimer.current);
        }
        setNotification(null);
    };
    
    // Centralized data fetching function, now with background refresh capability
    const fetchData = async (isBackgroundRefresh = false) => {
        if (!isBackgroundRefresh) {
            setLoading(true);
        } else {
            setIsSyncing(true);
        }
        setError(null);
        try {
            // Fetch with no-cache option to prevent getting stale data
            const response = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.success) {
                const processedDiagnoses = (result.data.Diagnosis || []).map((d: any) => ({
                    ...d,
                    labs_needed: typeof d.labs_needed === 'string' ? d.labs_needed.split(',').filter(l => l && l.trim() !== '') : []
                }));
                const processedClinics = (result.data.Clinics || []).map((c: any) => ({
                    ...c,
                    price_first_visit: Number(c.price_first_visit) || 0,
                    price_followup: Number(c.price_followup) || 0,
                }));
                const processedUsers = (result.data.Users || []).map((u: User) => ({
                    ...u,
                    role: u.role ? (u.role as string).trim().toLowerCase() as Role : u.role,
                }));
                 const processedRevenues = (result.data.Revenues || []).map((r: Revenue) => ({
                    ...r,
                    date: formatDateToLocalYYYYMMDD(r.date),
                }));
                const processedVisits = (result.data.Visits || []).map((v: Visit) => ({
                    ...v,
                    visit_date: formatDateToLocalYYYYMMDD(v.visit_date),
                }));
                const rawDisbursements = result.data.Disbursement || [];
                const processedDisbursements = rawDisbursements.map((d: any) => ({
                    disbursement_id: Number(d['رقم الطلب']),
                    date: formatDateToLocalYYYYMMDD(d['التاريخ']),
                    disbursement_type: d['نوع الصرف'] as DisbursementType,
                    amount: Number(d['المبلغ']),
                    beneficiary: d['المستفيد'],
                    purpose: d['الغرض من الصرف'],
                    status: d['الحالة'] as DisbursementStatus,
                }));
                const rawVouchers = result.data['Payment Voucher'] || [];
                const processedVouchers = rawVouchers.map((v: any) => ({
                    voucher_id: Number(v['رقم السند']),
                    request_id: Number(v['رقم الطلب']),
                    date: formatDateToLocalYYYYMMDD(v['التاريخ']),
                    disbursement_type: v['نوع الصرف'] as DisbursementType,
                    amount: Number(v['المبلغ']),
                    beneficiary: v['المستفيد'],
                    purpose: v['مقابل / الغرض من الصرف'],
                    payment_method: v['طريقة الصرف'] as PaymentMethod,
                    status: v['الحالة'] as PaymentVoucherStatus,
                }));

                // Process Settings - new structure is an array with a single object
                const settingsData = result.data.Settings || [];
                const settingsMap = settingsData.length > 0 ? settingsData[0] : {};
                localStorage.setItem('clinicSettings', JSON.stringify(settingsMap));
                setSettings(settingsMap);

                setPatients(result.data.Patients || []);
                setVisits(processedVisits);
                setDiagnoses(processedDiagnoses);
                setUsers(processedUsers);
                setClinics(processedClinics);
                setRevenues(processedRevenues);
                setDoctors(result.data.Doctors || []);
                setOptimizations(result.data.Optimization || []);
                setDisbursements(processedDisbursements);
                setPaymentVouchers(processedVouchers);
            } else {
                throw new Error(result.message || "Failed to fetch data.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            if (!isBackgroundRefresh) {
                setLoading(false);
            } else {
                setIsSyncing(false);
            }
        }
    };

    // Fetch initial data
    useEffect(() => {
        fetchData();
    }, []);

    // Effect to handle responsive sidebar state
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 1024) {
                setIsSidebarOpen(false);
            } else {
                setIsSidebarOpen(true);
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Effect to dynamically set the favicon
    useEffect(() => {
        if (settings.logo) {
            let favicon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
            if (favicon) {
                favicon.href = settings.logo;
            } else {
                favicon = document.createElement('link');
                favicon.rel = 'icon';
                favicon.href = settings.logo;
                document.head.appendChild(favicon);
            }
        }
    }, [settings.logo]);

    const postData = async (sheet: string, data: object) => {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify({ sheet, ...data }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            console.error("API Error Response:", errorBody);
            throw new Error(`فشل الاتصال بالخادم (الكود: ${response.status})`);
        }

        const resultText = await response.text();
        try {
            return JSON.parse(resultText);
        } catch (e) {
            console.error("Failed to parse JSON from server response:", resultText);
            throw new Error("استجابة الخادم غير صالحة.");
        }
    };


    const login = (username: string, password?: string, rememberMe: boolean = false): { success: boolean; error?: string } => {
        const foundUserByCredentials = users.find(u => u.username === username && u.password === password);

        if (!foundUserByCredentials) {
            return { success: false, error: 'اسم المستخدم أو كلمة المرور غير صحيحة.' };
        }

        if (foundUserByCredentials.status === 'معطل') {
            return { success: false, error: 'تم تعطيل الحساب برجاء مراجعة ادارة المستوصف' };
        }

        const { password: _, ...userToStore } = foundUserByCredentials;
        setUser(userToStore);
        localStorage.setItem('clinicUser', JSON.stringify(userToStore));
        
        if (rememberMe) {
            localStorage.setItem('rememberedUsername', username);
        } else {
            localStorage.removeItem('rememberedUsername');
        }

        setView('dashboard');
        showNotification('تم تسجيل الدخول بنجاح', 'success');
        return { success: true };
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('clinicUser');
    };

    const setView = (view: View) => {
        setCurrentView(view);
        if (window.innerWidth < 1024) {
            setIsSidebarOpen(false);
        }
        fetchData(true);
    };
    
    const setReportTargetVisitId = (visitId: number | null) => {
        setReportTargetVisitIdState(visitId);
        if (visitId !== null) {
            setView('medical-report');
        }
    };

    const updateSettings = async (newSettings: { [key: string]: string }) => {
        const currentSettings = { ...settings };
        try {
            setSettings(newSettings); // Optimistic update
            const result = await postData('Settings', { action: 'update', data: newSettings });
            if (result.success) {
                localStorage.setItem('clinicSettings', JSON.stringify(newSettings));
                showNotification('تم حفظ الإعدادات بنجاح', 'success');
                await fetchData(true); // Re-sync with backend
            } else {
                showNotification(result.message || 'فشل حفظ الإعدادات', 'error');
                setSettings(currentSettings); // Revert on failure
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل حفظ الإعدادات', 'error');
            setSettings(currentSettings); // Revert on failure
        }
    };


    const addPatient = async (patientData: Omit<Patient, 'patient_id'>) => {
        try {
            const result = await postData('Patients', patientData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة المريض بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة المريض', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة المريض', 'error');
            console.error("Failed to add patient:", e);
        }
    };

    const addManualRevenue = async (revenueData: Omit<Revenue, 'revenue_id'>): Promise<boolean> => {
        if (!revenueData.patient_name || !revenueData.patient_name.trim()) {
            showNotification('يرجى إدخال اسم المريض.', 'error');
            return false;
        }
        if (revenueData.patient_id > 0 && !patients.some(p => p.patient_id === revenueData.patient_id)) {
            showNotification('معرف المريض المحدد غير صالح.', 'error');
            return false;
        }
        if (!revenueData.clinic_id || revenueData.clinic_id <= 0) {
            showNotification('يرجى اختيار عيادة صحيحة.', 'error');
            return false;
        }
        if (!revenueData.amount && revenueData.amount !== 0) {
            showNotification('يرجى إدخال مبلغ صحيح.', 'error');
            return false;
        }
        if (!revenueData.date) {
            showNotification('يرجى تحديد تاريخ صحيح.', 'error');
            return false;
        }
        if (!Object.values(VisitType).includes(revenueData.type)) {
            showNotification('يرجى اختيار نوع زيارة صحيح.', 'error');
            return false;
        }

        if (isAdding) return false;
        setIsAdding(true);
        let success = false;
        try {
            const dataToSend = {
                ...revenueData,
                visit_id: revenueData.visit_id ?? 0,
            };
            const result = await postData('Revenues', dataToSend);
            if (result.success) {
                success = true;
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشل تسجيل الإيراد', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل تسجيل الإيراد', 'error');
            console.error("Failed to add manual revenue:", e);
        } finally {
            setIsAdding(false);
        }
        return success;
    };

    const addVisit = async (visitData: Omit<Visit, 'visit_id' | 'queue_number' | 'status'>): Promise<Visit> => {
        if (isAddingVisit) throw new Error("لا يمكن إضافة زيارة أخرى أثناء معالجة الطلب الحالي.");
        setIsAddingVisit(true);
    
        try {
            let syncResponse = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!syncResponse.ok) throw new Error(`فشل مزامنة البيانات قبل الإضافة (الكود: ${syncResponse.status})`);
            
            let syncResult = await syncResponse.json();
            if (!syncResult.success) throw new Error(syncResult.message || "فشلت مزامنة البيانات.");
            
            const currentVisits: Visit[] = (syncResult.data.Visits || []).map((v: any) => ({
                ...v,
                visit_date: formatDateToLocalYYYYMMDD(v.visit_date)
            }));
            
            const visitDate = visitData.visit_date;

            const visitsForClinicOnDate = currentVisits.filter(v => 
                v.clinic_id === visitData.clinic_id && v.visit_date === visitDate
            );
            const newQueueNumber = visitsForClinicOnDate.length + 1;
    
            const visitToSend = {
                patient_id: visitData.patient_id,
                clinic_id: visitData.clinic_id,
                visit_date: visitDate,
                queue_number: newQueueNumber,
                status: VisitStatus.Waiting,
                visit_type: visitData.visit_type,
                visit_time: visitData.visit_time || '',
            };
            const visitResult = await postData('Visits', visitToSend);
            
            if (!visitResult.success) {
                 throw new Error(visitResult.message || 'فشلت إضافة الزيارة');
            }
            
            if (visitResult.data) {
                const newVisit = mapRowToObject<Visit>(visitResult.data, 'Visits');
                await fetchData(true);
                return newVisit;
            }

            await new Promise(resolve => setTimeout(resolve, 1000));

            syncResponse = await fetch(SCRIPT_URL, { cache: 'no-cache' });
            if (!syncResponse.ok) throw new Error(`فشل استرداد الزيارة بعد إنشائها (الكود: ${syncResponse.status})`);
            
            syncResult = await syncResponse.json();
            if (!syncResult.success) throw new Error(syncResult.message || "فشل استرداد الزيارة بعد إنشائها.");
            
            const latestVisits: Visit[] = (syncResult.data.Visits || []).map((v: any) => ({
                ...v,
                visit_date: formatDateToLocalYYYYMMDD(v.visit_date),
            }));

            const potentialMatches = latestVisits.filter(v => 
                v.patient_id === visitToSend.patient_id &&
                v.clinic_id === visitToSend.clinic_id &&
                v.visit_date === visitToSend.visit_date &&
                v.visit_type === visitToSend.visit_type
            );

            let createdVisit: Visit | undefined;
            if (potentialMatches.length > 0) {
                // Find the one with the highest visit_id, assuming it's the most recently created.
                createdVisit = potentialMatches.reduce((latest, current) => {
                    return latest.visit_id > current.visit_id ? latest : current;
                });
            }
            
            if (createdVisit) {
                await fetchData(true);
                return createdVisit;
            } else {
                throw new Error('تمت إضافة الزيارة، ولكن تعذر تأكيدها فوراً. يرجى التحقق من قائمة الزيارات.');
            }
        } catch (e: any) {
            console.error("Failed to add visit:", e);
            throw e;
        } finally {
            setIsAddingVisit(false);
        }
    };
    
    const updateVisit = async (visitId: number, visitData: Partial<Omit<Visit, 'visit_id'>>) => {
        try {
            const dataToSend = {
                action: 'update',
                visit_id: visitId,
                ...visitData
            };
            const result = await postData('Visits', dataToSend);
            if (!result.success) {
                 showNotification(result.message || 'فشل تحديث حالة الزيارة', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل تحديث حالة الزيارة', 'error');
            console.error("Failed to update visit:", e);
        }
    };

    const addDiagnosis = async (diagnosisData: Omit<Diagnosis, 'diagnosis_id'>) => {
        try {
            const dataToSend = {
                ...diagnosisData,
                labs_needed: Array.isArray(diagnosisData.labs_needed) ? diagnosisData.labs_needed.join(',') : '',
            };

            const result = await postData('Diagnosis', dataToSend);
            if (result.success) {
                await updateVisit(diagnosisData.visit_id, { status: VisitStatus.Completed });
                showNotification(result.message || 'تم حفظ التشخيص بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشل حفظ التشخيص', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل حفظ التشخيص', 'error');
            console.error("Failed to add diagnosis:", e);
        }
    };
    
    const addUser = async (userData: Omit<User, 'user_id'>) => {
        try {
            const dataToSend = { ...userData, status: 'مفعل' };
            const result = await postData('Users', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة المستخدم بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة المستخدم', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to add user:", e);
        }
    };

    const addDoctor = async (doctorData: Omit<Doctor, 'doctor_id'>) => {
        try {
            const result = await postData('Doctors', doctorData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة الطبيب بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة الطبيب', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة الطبيب', 'error');
            console.error("Failed to add doctor:", e);
        }
    };

    const addClinic = async (clinicData: Omit<Clinic, 'clinic_id' | 'doctor_name'>) => {
        try {
            const result = await postData('Clinics', clinicData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة العيادة بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة العيادة', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة العيادة', 'error');
            console.error("Failed to add clinic:", e);
        }
    };

    const addOptimization = async (suggestionData: Omit<Optimization, 'optimization_id'>) => {
        try {
            const result = await postData('Optimization', suggestionData);
            if (result.success) {
                showNotification('تم إرسال اقتراحك بنجاح. شكراً لك!', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشل إرسال الاقتراح', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشل إرسال الاقتراح', 'error');
            console.error("Failed to add optimization:", e);
        }
    };

    const addDisbursement = async (disbursementData: Omit<Disbursement, 'disbursement_id' | 'status'>) => {
        setIsAdding(true);
        try {
            const dataWithStatus = { ...disbursementData, status: DisbursementStatus.Pending };
            const arabicKeyData = {
                "التاريخ": dataWithStatus.date,
                "نوع الصرف": dataWithStatus.disbursement_type,
                "المبلغ": dataWithStatus.amount,
                "المستفيد": dataWithStatus.beneficiary,
                "الغرض من الصرف": dataWithStatus.purpose,
                "الحالة": dataWithStatus.status,
            };

            const result = await postData('Disbursement', arabicKeyData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة طلب الصرف بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة طلب الصرف', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة طلب الصرف', 'error');
            console.error("Failed to add disbursement:", e);
        } finally {
            setIsAdding(false);
        }
    };

    const updateDisbursementStatus = async (disbursementId: number, status: DisbursementStatus) => {
        const originalDisbursement = disbursements.find(d => d.disbursement_id === disbursementId);
        if (!originalDisbursement) {
            showNotification('لم يتم العثور على طلب الصرف', 'error');
            return;
        }

        try {
            const rowData = {
                "رقم الطلب": originalDisbursement.disbursement_id,
                "التاريخ": originalDisbursement.date,
                "نوع الصرف": originalDisbursement.disbursement_type,
                "المبلغ": originalDisbursement.amount,
                "المستفيد": originalDisbursement.beneficiary,
                "الغرض من الصرف": originalDisbursement.purpose,
                "الحالة": status,
            };

            const payload = {
                action: 'update',
                key: { "رقم الطلب": disbursementId },
                data: rowData,
            };

            const result = await postData('Disbursement', payload);
            if (result.success) {
                showNotification(result.message || 'تم تحديث حالة الطلب بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل تحديث حالة الطلب', 'error');
            }
        } catch (e: any)
        {
            showNotification(e.message || 'فشل تحديث حالة الطلب', 'error');
            console.error("Failed to update disbursement status:", e);
        }
    };

    const addPaymentVoucher = async (voucherData: Omit<PaymentVoucher, 'voucher_id' | 'status'>) => {
        setIsAdding(true);
        try {
            const dataWithStatus = { ...voucherData, status: PaymentVoucherStatus.Pending };
            const arabicKeyData = {
                "رقم الطلب": dataWithStatus.request_id,
                "التاريخ": dataWithStatus.date,
                "نوع الصرف": dataWithStatus.disbursement_type,
                "المبلغ": dataWithStatus.amount,
                "المستفيد": dataWithStatus.beneficiary,
                "مقابل / الغرض من الصرف": dataWithStatus.purpose,
                "طريقة الصرف": dataWithStatus.payment_method,
                "الحالة": dataWithStatus.status,
            };

            const result = await postData('Payment Voucher', arabicKeyData);
            if (result.success) {
                showNotification(result.message || 'تمت إضافة سند الصرف بنجاح', 'success');
                await fetchData(true);
            } else {
                showNotification(result.message || 'فشلت إضافة سند الصرف', 'error');
            }
        } catch (e: any) {
            showNotification(e.message || 'فشلت إضافة سند الصرف', 'error');
            console.error("Failed to add payment voucher:", e);
        } finally {
            setIsAdding(false);
        }
    };

    const updatePaymentVoucherStatus = async (voucherId: number, status: PaymentVoucherStatus) => {
        const originalVoucher = paymentVouchers.find(v => v.voucher_id === voucherId);
        if (!originalVoucher) {
            showNotification('لم يتم العثور على سند الصرف', 'error');
            return;
        }
        try {
            const rowData = {
                "رقم السند": originalVoucher.voucher_id,
                "رقم الطلب": originalVoucher.request_id,
                "التاريخ": originalVoucher.date,
                "نوع الصرف": originalVoucher.disbursement_type,
                "المبلغ": originalVoucher.amount,
                "المستفيد": originalVoucher.beneficiary,
                "مقابل / الغرض من الصرف": originalVoucher.purpose,
                "طريقة الصرف": originalVoucher.payment_method,
                "الحالة": status,
            };
            
            const payload = {
                action: 'update',
                key: { "رقم السند": voucherId },
                data: rowData,
            };

            const result = await postData('Payment Voucher', payload);
            if (result.success) {
                showNotification(result.message || 'تم تحديث حالة السند بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل تحديث حالة السند', 'error');
            }
        } catch (e: any)
        {
            showNotification(e.message || 'فشل تحديث حالة السند', 'error');
            console.error("Failed to update payment voucher status:", e);
        }
    };

    const updateClinic = async (clinicId: number, clinicData: Partial<Omit<Clinic, 'clinic_id'>>) => {
        try {
            const dataToSend = {
                action: 'update',
                clinic_id: clinicId,
                ...clinicData
            };
            const result = await postData('Clinics', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تم تحديث العيادة بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل تحديث العيادة', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to update clinic:", e);
        }
    };

    const deleteClinic = async (clinicId: number) => {
        try {
            const dataToSend = {
                action: 'delete',
                clinic_id: clinicId
            };
            const result = await postData('Clinics', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تم حذف العيادة بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل حذف العيادة', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to delete clinic:", e);
        }
    };


    const updateUser = async (userId: number, userData: Partial<Omit<User, 'user_id'>>) => {
        try {
            const dataToSend = {
                action: 'update',
                user_id: userId,
                ...userData
            };
            const result = await postData('Users', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تم تحديث المستخدم بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل تحديث المستخدم', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to update user:", e);
        }
    };

    const deleteUser = async (userId: number) => {
        try {
            const dataToSend = {
                action: 'delete',
                user_id: userId
            };
            const result = await postData('Users', dataToSend);
            if (result.success) {
                showNotification(result.message || 'تم حذف المستخدم بنجاح', 'success');
                await fetchData(true);
            } else {
                 showNotification(result.message || 'فشل حذف المستخدم', 'error');
            }
        } catch (e: any) {
            showNotification(e.message, 'error');
            console.error("Failed to delete user:", e);
        }
    };

    const updateVisitStatus = (visitId: number, status: VisitStatus) => {
        setVisits(prevVisits =>
            prevVisits.map(v => v.visit_id === visitId ? { ...v, status } : v)
        );
    };
    
    const value = {
        user, login, logout, currentView, setView,
        patients, visits, diagnoses, users, clinics, revenues, doctors, optimizations, disbursements, paymentVouchers,
        addPatient, addVisit, addDiagnosis, addManualRevenue, updateVisitStatus,
        addUser, updateUser, addDoctor, deleteUser,
        addClinic, updateClinic, deleteClinic, addOptimization,
        addDisbursement, updateDisbursementStatus,
        addPaymentVoucher, updatePaymentVoucherStatus,
        isAdding, isAddingVisit,
        loading, isSyncing, error,
        notification, hideNotification, showNotification,
        isSidebarOpen, toggleSidebar,
        clinicLogo: settings.logo || null,
        clinicStamp: settings.stamp || null,
        clinicSignature: settings.signature || null,
        settings, updateSettings,
        reportTargetVisitId, setReportTargetVisitId,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};