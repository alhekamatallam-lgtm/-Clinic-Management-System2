// types.ts

export interface Patient {
    patient_id: number;
    name: string;
    dob: string;
    gender: 'ذكر' | 'أنثى';
    phone: string;
    address: string;
}

export interface Visit {
    visit_id: number;
    patient_id: number;
    clinic_id: number;
    visit_date: string;
    visit_time?: string;
    queue_number: number;
    status: VisitStatus;
    visit_type: VisitType;
}

export interface Diagnosis {
    diagnosis_id: number;
    visit_id: number;
    doctor: string; // username
    diagnosis: string;
    prescription: string;
    labs_needed: string[];
    notes: string;
}

export interface Revenue {
    revenue_id: number;
    visit_id: number;
    patient_id: number;
    patient_name: string;
    clinic_id: number;
    amount: number;
    date: string;
    type: VisitType;
    notes: string;
}

export interface User {
    user_id: number;
    username: string;
    password?: string;
    role: Role;
    clinic_id?: number;
    clinic?: string;
    doctor_id?: number;
    doctor_name?: string;
    Name: string;
    status: 'مفعل' | 'معطل';
}

export interface Doctor {
    doctor_id: number;
    doctor_name: string;
    specialty: string;
    clinic_id: number;
    phone: string;
    email: string;
    shift: 'صباحي' | 'مسائي';
    status: 'مفعل' | 'غير نشط';
    signature: string;
}

export interface Clinic {
    clinic_id: number;
    clinic_name: string;
    doctor_id: number;
    doctor_name: string;
    max_patients_per_day: number;
    price_first_visit: number;
    price_followup: number;
    shift: 'صباحي' | 'مسائي';
    notes: string;
}

export interface Optimization {
    optimization_id: number;
    user: string;
    name: string;
    page: string;
    optimize: string;
}

export interface Disbursement {
    disbursement_id: number;
    date: string;
    disbursement_type: DisbursementType;
    amount: number;
    beneficiary: string;
    purpose: string;
    status: DisbursementStatus;
}

export interface PaymentVoucher {
    voucher_id: number;
    request_id: number;
    date: string;
    disbursement_type: DisbursementType;
    amount: number;
    beneficiary: string;
    purpose: string;
    payment_method: PaymentMethod;
    status: PaymentVoucherStatus;
}


export enum Role {
    Manager = 'manager',
    Doctor = 'doctor',
    Reception = 'reception',
    QueueScreen = 'queuescreen',
    Accountant = 'accountant',
}

export enum VisitStatus {
    Waiting = 'Waiting',
    InProgress = 'In Progress',
    Completed = 'Completed',
    Canceled = 'Canceled',
}

export enum VisitType {
    FirstVisit = 'كشف جديد',
    FollowUp = 'متابعة',
}

export enum DisbursementStatus {
    Pending = 'بانتظار الاعتماد',
    Approved = 'معتمد',
    Rejected = 'مرفوض',
}

export enum DisbursementType {
    Cash = 'نقدي',
    Transfer = 'تحويل',
}

export enum PaymentVoucherStatus {
    Pending = 'بانتظار الاعتماد',
    Approved = 'معتمد',
    Rejected = 'مرفوض',
}

export enum PaymentMethod {
    BankTransfer = 'تحويل بنكي',
    Cash = 'نقدي',
    Cheque = 'شيك',
}


export type View = 
    | 'dashboard'
    | 'patients'
    | 'visits'
    | 'diagnosis'
    | 'users'
    | 'clinics'
    | 'doctors'
    | 'reports'
    | 'medical-report'
    | 'daily-clinic-report'
    | 'queue'
    | 'manual-revenue'
    | 'revenues'
    | 'disbursements'
    | 'settings'
    | 'documentation'
    | 'optimization';