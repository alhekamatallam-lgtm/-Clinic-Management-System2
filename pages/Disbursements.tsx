import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Disbursement, DisbursementStatus, DisbursementType, PaymentVoucherStatus, Role, PaymentMethod } from '../types';
import Modal from '../components/ui/Modal';
import { PlusIcon, CheckCircleIcon, XCircleIcon, ChevronDownIcon, PrinterIcon, EyeIcon } from '@heroicons/react/24/solid';

const getLocalYYYYMMDD = (dateStr: string | Date): string => {
    try {
        const date = new Date(dateStr);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch {
        return '';
    }
};

const translateDisbursementStatus = (status: DisbursementStatus) => {
    switch (status) {
        case DisbursementStatus.Pending: return 'بانتظار الاعتماد';
        case DisbursementStatus.Approved: return 'معتمد';
        case DisbursementStatus.Rejected: return 'مرفوض';
        default: return status;
    }
};

const getStatusColor = (status: DisbursementStatus) => {
    switch (status) {
        case DisbursementStatus.Pending: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        case DisbursementStatus.Approved: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
        case DisbursementStatus.Rejected: return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
};

// Printable Component
const PrintableDisbursement: React.FC<{ disbursement: Disbursement; logo: string | null; stamp: string | null; }> = ({ disbursement, logo, stamp }) => {
    return (
        <div className="p-8 bg-white text-black font-serif">
            <header className="flex justify-between items-center border-b-2 border-gray-800 pb-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">طلب صرف</h1>
                    <p className="text-md text-gray-600">Disbursement Request</p>
                </div>
                {logo && <img src={logo} alt="شعار المستوصف" className="h-20 w-auto object-contain" />}
            </header>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-md">
                <p><strong>رقم الطلب:</strong> {disbursement.disbursement_id}</p>
                <p><strong>التاريخ:</strong> {disbursement.date}</p>
                <p><strong>المستفيد:</strong> {disbursement.beneficiary}</p>
                <p><strong>المبلغ:</strong> {disbursement.amount.toLocaleString()} ريال</p>
                <p className="col-span-2"><strong>الغرض من الصرف:</strong> {disbursement.purpose}</p>
                <p className="col-span-2"><strong>الحالة:</strong> {translateDisbursementStatus(disbursement.status)}</p>
            </div>

            <footer className="pt-24 mt-16 border-t">
                <div className="flex justify-between items-end">
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-2">صاحب الطلب</p>
                        <p className="border-b-2 border-dotted border-gray-400 w-full h-12"></p>
                    </div>
                     <div className="text-center w-1/3">
                        {stamp ? (
                             <img src={stamp} alt="ختم المستوصف" className="h-24 mx-auto object-contain" />
                        ) : (
                             <div className="h-24 w-24 border-2 border-dashed rounded-full mx-auto flex items-center justify-center text-gray-400">
                                <p className="text-xs">مكان الختم</p>
                            </div>
                        )}
                    </div>
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-2">المدير</p>
                        <p className="border-b-2 border-dotted border-gray-400 w-full h-12"></p>
                    </div>
                </div>
            </footer>
        </div>
    );
};


const Disbursements: React.FC = () => {
    const { user, disbursements, paymentVouchers, addDisbursement, updateDisbursementStatus, addPaymentVoucher, isAdding, clinicLogo, clinicStamp } = useApp();
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
    const [selectedDisbursement, setSelectedDisbursement] = useState<Disbursement | null>(null);
    const [isArchiveOpen, setIsArchiveOpen] = useState(false);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);

    // Print & Preview State
    const [itemToPreview, setItemToPreview] = useState<Disbursement | null>(null);
    const [itemToPrint, setItemToPrint] = useState<Disbursement | null>(null);

    const initialFormState: Omit<Disbursement, 'disbursement_id' | 'status'> = {
        date: getLocalYYYYMMDD(new Date()),
        disbursement_type: DisbursementType.Cash,
        amount: 0,
        beneficiary: '',
        purpose: '',
    };
    const [formData, setFormData] = useState(initialFormState);
    const [voucherFormData, setVoucherFormData] = useState({ payment_method: PaymentMethod.Cash, notes: '' });
    
    // Reliable Print Effect
    useEffect(() => {
        if (itemToPrint) {
            // This effect runs after the component re-renders with the printable content.
            window.print();
            // The print dialog is modal, so this line runs after it's closed.
            setItemToPrint(null);
        }
    }, [itemToPrint]);


    const { pending, waitingForVoucher, pendingVoucher, archive } = useMemo(() => {
        const pending: Disbursement[] = [];
        const waitingForVoucher: Disbursement[] = [];
        const pendingVoucher: Disbursement[] = [];
        const archive: Disbursement[] = [];

        disbursements.forEach(d => {
            const hasVoucher = paymentVouchers.find(v => v.request_id === d.disbursement_id);
            const isVoucherFinal = hasVoucher && (hasVoucher.status === PaymentVoucherStatus.Approved || hasVoucher.status === PaymentVoucherStatus.Rejected);
            
            if (d.status === DisbursementStatus.Pending) {
                pending.push(d);
            } else if (d.status === DisbursementStatus.Approved && !hasVoucher) {
                waitingForVoucher.push(d);
            } else if (hasVoucher && hasVoucher.status === PaymentVoucherStatus.Pending) {
                pendingVoucher.push(d);
            } else if (d.status === DisbursementStatus.Rejected || isVoucherFinal) {
                archive.push(d);
            }
        });
        
        const sortDesc = (a: Disbursement, b: Disbursement) => b.disbursement_id - a.disbursement_id;

        return {
            pending: pending.sort(sortDesc),
            waitingForVoucher: waitingForVoucher.sort(sortDesc),
            pendingVoucher: pendingVoucher.sort(sortDesc),
            archive: archive.sort(sortDesc)
        };
    }, [disbursements, paymentVouchers]);

    const handleOpenAddModal = () => {
        setFormData(initialFormState);
        setIsAddModalOpen(true);
    };

    const handleOpenVoucherModal = (disbursement: Disbursement) => {
        setSelectedDisbursement(disbursement);
        setVoucherFormData({ payment_method: PaymentMethod.Cash, notes: '' });
        setIsVoucherModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsAddModalOpen(false);
        setIsVoucherModalOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: name === 'amount' ? Number(value) : value }));
    };

    const handleVoucherChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setVoucherFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await addDisbursement(formData);
        handleCloseModals();
    };

    const handleVoucherSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedDisbursement) return;
        await addPaymentVoucher({
            request_id: selectedDisbursement.disbursement_id,
            date: getLocalYYYYMMDD(new Date()),
            disbursement_type: selectedDisbursement.disbursement_type,
            amount: selectedDisbursement.amount,
            beneficiary: selectedDisbursement.beneficiary,
            purpose: selectedDisbursement.purpose,
            payment_method: voucherFormData.payment_method,
            notes: voucherFormData.notes,
        });
        handleCloseModals();
    };

    const handleStatusUpdate = async (disbursement: Disbursement, status: DisbursementStatus) => {
        setUpdatingStatus(disbursement.disbursement_id);
        await updateDisbursementStatus(disbursement, status);
        setUpdatingStatus(null);
    };

    const renderActions = (d: Disbursement) => {
        const hasVoucher = paymentVouchers.find(v => v.request_id === d.disbursement_id);
        const canCreateVoucher = user?.role === Role.Accountant && d.status === DisbursementStatus.Approved && !hasVoucher;

        return (
             <div className="flex items-center gap-1">
                {user?.role === Role.Manager && d.status === DisbursementStatus.Pending && (
                    <>
                        <button onClick={() => handleStatusUpdate(d, DisbursementStatus.Approved)} disabled={updatingStatus === d.disbursement_id} className="p-2 text-green-600 hover:bg-green-100 rounded-full disabled:opacity-50" title="اعتماد"> <CheckCircleIcon className="h-5 w-5" /> </button>
                        <button onClick={() => handleStatusUpdate(d, DisbursementStatus.Rejected)} disabled={updatingStatus === d.disbursement_id} className="p-2 text-red-600 hover:bg-red-100 rounded-full disabled:opacity-50" title="رفض"> <XCircleIcon className="h-5 w-5" /> </button>
                    </>
                )}
                 {canCreateVoucher && (
                    <button onClick={() => handleOpenVoucherModal(d)} className="bg-blue-500 text-white px-3 py-1 text-sm rounded-md hover:bg-blue-600">إنشاء سند</button>
                 )}
                <button onClick={() => setItemToPreview(d)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="معاينة"><EyeIcon className="h-5 w-5" /></button>
                <button onClick={() => setItemToPrint(d)} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full" title="طباعة"><PrinterIcon className="h-5 w-5" /></button>
            </div>
        );
    }

    const DisbursementTable: React.FC<{ title: string; data: Disbursement[]; total?: number; }> = ({ title, data }) => (
        <div>
            <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400 my-2">{title} ({data.length})</h3>
             <div className="overflow-x-auto">
                <table className="w-full text-right">
                    <thead className="bg-gray-100 dark:bg-gray-700">
                        <tr>
                            {["#", "التاريخ", "المستفيد", "المبلغ", "الغرض", "الحالة", "إجراء"].map(h => 
                                <th key={h} className="p-3 text-sm font-semibold tracking-wide text-gray-700 dark:text-gray-300">{h}</th>
                            )}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {data.map(d => (
                            <tr key={d.disbursement_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3 text-sm">{d.disbursement_id}</td>
                                <td className="p-3 text-sm">{d.date}</td>
                                <td className="p-3 text-sm">{d.beneficiary}</td>
                                <td className="p-3 text-sm">{d.amount.toLocaleString()} ريال</td>
                                <td className="p-3 text-sm">{d.purpose}</td>
                                <td className="p-3 text-sm"><span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(d.status)}`}>{translateDisbursementStatus(d.status)}</span></td>
                                <td className="p-3">{renderActions(d)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {data.length === 0 && <p className="text-center p-4 text-gray-500">لا توجد طلبات في هذا القسم.</p>}
        </div>
    );
    
    if (itemToPrint) {
        return (
            <div className="printable-area">
                <PrintableDisbursement disbursement={itemToPrint} logo={clinicLogo} stamp={clinicStamp} />
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
            <div className="flex justify-between items-center mb-6 no-print">
                <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300">إدارة طلبات الصرف</h1>
                {(user?.role === Role.Reception || user?.role === Role.Accountant || user?.role === Role.Manager) &&
                    <button onClick={handleOpenAddModal} className="flex items-center bg-teal-500 text-white px-4 py-2 rounded-lg hover:bg-teal-600 transition-colors">
                        <PlusIcon className="h-5 w-5 ml-2"/>
                        إضافة طلب صرف
                    </button>
                }
            </div>

            <div className="space-y-8 no-print">
                <DisbursementTable title="طلبات بانتظار الاعتماد" data={pending} />
                <DisbursementTable title="طلبات بانتظار الصرف" data={waitingForVoucher} />
                <DisbursementTable title="طلبات بانتظار اعتماد السند" data={pendingVoucher} />

                <div>
                    <button onClick={() => setIsArchiveOpen(!isArchiveOpen)} className="w-full flex justify-between items-center p-3 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                        <h3 className="text-lg font-semibold text-gray-600 dark:text-gray-400">الأرشيف ({archive.length})</h3>
                        <ChevronDownIcon className={`h-6 w-6 transition-transform ${isArchiveOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isArchiveOpen && (
                        <div className="mt-2 border-t pt-2">
                             <DisbursementTable title="" data={archive} />
                        </div>
                    )}
                </div>
            </div>

            <Modal title="إضافة طلب صرف جديد" isOpen={isAddModalOpen} onClose={handleCloseModals}>
                <form onSubmit={handleAddSubmit} className="space-y-4">
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="text" name="beneficiary" placeholder="المستفيد" value={formData.beneficiary} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <input type="number" name="amount" placeholder="المبلغ" value={String(formData.amount === 0 ? '' : formData.amount)} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required min="0" />
                    <select name="disbursement_type" value={formData.disbursement_type} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white">
                        <option value={DisbursementType.Cash}>نقدي</option>
                        <option value={DisbursementType.Transfer}>تحويل</option>
                    </select>
                    <textarea name="purpose" placeholder="الغرض من الصرف" value={formData.purpose} onChange={handleChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" required />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإضافة...' : 'إضافة الطلب'}</button>
                </form>
            </Modal>
            
            <Modal title={`إنشاء سند صرف للطلب #${selectedDisbursement?.disbursement_id}`} isOpen={isVoucherModalOpen} onClose={handleCloseModals}>
                 <form onSubmit={handleVoucherSubmit} className="space-y-4">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                        <p><strong>المبلغ:</strong> {selectedDisbursement?.amount} ريال</p>
                        <p><strong>المستفيد:</strong> {selectedDisbursement?.beneficiary}</p>
                    </div>
                    <select name="payment_method" value={voucherFormData.payment_method} onChange={handleVoucherChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white bg-white">
                        <option value={PaymentMethod.Cash}>نقدي</option>
                        <option value={PaymentMethod.BankTransfer}>تحويل بنكي</option>
                        <option value={PaymentMethod.Cheque}>شيك</option>
                    </select>
                    <textarea name="notes" placeholder="ملاحظات (اختياري)" value={voucherFormData.notes} onChange={handleVoucherChange} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
                    <button type="submit" className="w-full bg-teal-500 text-white p-2 rounded hover:bg-teal-600 disabled:bg-gray-400" disabled={isAdding}>{isAdding ? 'جاري الإنشاء...' : 'إنشاء السند'}</button>
                </form>
            </Modal>
            
            {itemToPreview && (
                <Modal isOpen={!!itemToPreview} onClose={() => setItemToPreview(null)} title="معاينة طلب الصرف">
                    <div className="printable-area">
                        <PrintableDisbursement disbursement={itemToPreview} logo={clinicLogo} stamp={clinicStamp} />
                    </div>
                    <div className="mt-4 flex justify-end gap-2 no-print">
                        <button onClick={() => setItemToPreview(null)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">إغلاق</button>
                        <button onClick={() => { setItemToPrint(itemToPreview); setItemToPreview(null); }} className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600">طباعة</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default Disbursements;