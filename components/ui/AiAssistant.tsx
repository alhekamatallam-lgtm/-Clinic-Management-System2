import React, { useState, useRef, useEffect } from 'react';
import { HeartIcon, XMarkIcon, PaperAirplaneIcon } from '@heroicons/react/24/solid';
import { GoogleGenAI, FunctionDeclaration, Type } from '@google/genai';
import { useApp } from '../../contexts/AppContext';
import { Role, DisbursementStatus, DisbursementType, PaymentVoucherStatus, PaymentMethod } from '../../types';

const AiAssistant: React.FC = () => {
    const { 
        user, 
        disbursements, 
        paymentVouchers, 
        addDisbursement, 
        updateDisbursementStatus, 
        addPaymentVoucher, 
        updatePaymentVoucherStatus,
        showNotification
    } = useApp();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ text: string; sender: 'user' | 'bot' }[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        // Set an initial welcome message from Salem when the chat window opens for the first time
        if (isOpen && messages.length === 0) {
            setMessages([
                {
                    sender: 'bot',
                    text: 'أهلاً بك، أنا سالم، مساعدك الذكي. كيف يمكنني خدمتك اليوم؟',
                },
            ]);
        }
    }, [isOpen]); // Depend on isOpen to trigger when the assistant is opened
    
    // --- Function Declarations for AI Tools ---
    const tools: FunctionDeclaration[] = [
        {
            name: 'create_disbursement_request',
            description: 'إنشاء طلب صرف جديد.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    amount: { type: Type.NUMBER, description: 'مبلغ الصرف' },
                    beneficiary: { type: Type.STRING, description: 'اسم المستفيد' },
                    purpose: { type: Type.STRING, description: 'الغرض من الصرف' },
                    disbursement_type: { type: Type.STRING, description: 'نوع الصرف (نقدي أو تحويل)', enum: ['نقدي', 'تحويل'] },
                },
                required: ['amount', 'beneficiary', 'purpose', 'disbursement_type'],
            },
        },
        {
            name: 'approve_disbursement_request',
            description: 'اعتماد طلب صرف معلق.',
            parameters: { type: Type.OBJECT, properties: { request_id: { type: Type.NUMBER, description: 'رقم طلب الصرف' } }, required: ['request_id'] },
        },
        {
            name: 'reject_disbursement_request',
            description: 'رفض طلب صرف معلق.',
            parameters: { type: Type.OBJECT, properties: { request_id: { type: Type.NUMBER, description: 'رقم طلب الصرف' } }, required: ['request_id'] },
        },
        {
            name: 'create_payment_voucher',
            description: 'إنشاء سند صرف لطلب معتمد.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    request_id: { type: Type.NUMBER, description: 'رقم طلب الصرف المعتمد' },
                    payment_method: { type: Type.STRING, description: 'طريقة الدفع (تحويل بنكي, نقدي, شيك)', enum: ['تحويل بنكي', 'نقدي', 'شيك'] },
                    notes: { type: Type.STRING, description: 'ملاحظات المحاسب (اختياري)' },
                },
                required: ['request_id', 'payment_method'],
            },
        },
        {
            name: 'approve_payment_voucher',
            description: 'اعتماد سند صرف معلق.',
            parameters: { type: Type.OBJECT, properties: { request_id: { type: Type.NUMBER, description: 'رقم الطلب المرتبط بالسند' } }, required: ['request_id'] },
        },
        {
            name: 'reject_payment_voucher',
            description: 'رفض سند صرف معلق.',
            parameters: { type: Type.OBJECT, properties: { request_id: { type: Type.NUMBER, description: 'رقم الطلب المرتبط بالسند' } }, required: ['request_id'] },
        }
    ];

    const getAvailableTools = (): FunctionDeclaration[] => {
        if (!user) return [];
        switch (user.role) {
            case Role.Manager:
                return tools; // Manager can do everything
            case Role.Accountant:
                return tools.filter(t => ['create_disbursement_request', 'create_payment_voucher'].includes(t.name));
            case Role.Reception:
                return tools.filter(t => t.name === 'create_disbursement_request');
            default:
                return [];
        }
    };

    const generateContextualPrompt = (userInput: string) => {
        let context = `أنت سالم، مساعد ذكي في نظام إدارة العيادات. المستخدم الحالي هو ${user?.Name} بصلاحية "${user?.role}".
استخدم الأدوات المتاحة لك لتنفيذ طلبات المستخدم المتعلقة بالنظام فقط. قم بالرد باللغة العربية.

**الحالة الحالية للنظام:**
`;
        const pendingDisbursements = disbursements.filter(d => d.status === DisbursementStatus.Pending);
        if (pendingDisbursements.length > 0) {
            context += '\nطلبات الصرف المعلقة (بانتظار موافقة المدير):\n';
            pendingDisbursements.forEach(d => {
                context += `- رقم ${d.disbursement_id}: ${d.amount} ريال لـ ${d.beneficiary} (${d.purpose})\n`;
            });
        }

        const approvedForVoucher = disbursements.filter(d => d.status === DisbursementStatus.Approved && !paymentVouchers.some(v => v.request_id === d.disbursement_id));
        if (approvedForVoucher.length > 0) {
            context += '\nطلبات معتمدة بانتظار إنشاء سند صرف (من المحاسب):\n';
            approvedForVoucher.forEach(d => {
                context += `- رقم ${d.disbursement_id}: ${d.amount} ريال لـ ${d.beneficiary}\n`;
            });
        }
        
        const pendingVouchers = paymentVouchers.filter(v => v.status === PaymentVoucherStatus.Pending);
        if (pendingVouchers.length > 0) {
            context += '\nسندات صرف معلقة (بانتظار موافقة المدير):\n';
            pendingVouchers.forEach(v => {
                context += `- سند متعلق بالطلب رقم ${v.request_id}: ${v.amount} ريال لـ ${v.beneficiary}\n`;
            });
        }

        context += `\n**طلب المستخدم:** "${userInput}"`;
        return context;
    };


    const toggleAssistant = () => setIsOpen(!isOpen);

    const handleSend = async () => {
        if (!input.trim() || !user) return;

        const userMessage = { text: input, sender: 'user' as 'user' };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            if (!process.env.API_KEY) throw new Error("API key not configured.");
            
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const availableTools = getAvailableTools();

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: generateContextualPrompt(currentInput),
                tools: availableTools.length > 0 ? [{ functionDeclarations: availableTools }] : undefined,
            });

            const functionCalls = response.functionCalls;
            
            if (functionCalls && functionCalls.length > 0) {
                setIsLoading(false); // Stop "thinking" immediately after getting the call
                for (const call of functionCalls) {
                    const { name, args } = call;
                    setMessages(prev => [...prev, { text: `جاري تنفيذ: ${name}...`, sender: 'bot' }]);
                    
                    let resultMessage = "تم تنفيذ الإجراء بنجاح.";
                    try {
                        switch (name) {
                            case 'create_disbursement_request':
                                await addDisbursement({
                                    date: new Date().toISOString().split('T')[0],
                                    amount: args.amount,
                                    beneficiary: args.beneficiary,
                                    purpose: args.purpose,
                                    disbursement_type: args.disbursement_type as DisbursementType
                                });
                                break;
                            case 'approve_disbursement_request':
                            case 'reject_disbursement_request':
                                const requestToUpdate = disbursements.find(d => d.disbursement_id === args.request_id);
                                if (!requestToUpdate) throw new Error(`لم يتم العثور على طلب بالرقم ${args.request_id}`);
                                const newStatus = name === 'approve_disbursement_request' ? DisbursementStatus.Approved : DisbursementStatus.Rejected;
                                await updateDisbursementStatus(requestToUpdate, newStatus);
                                break;
                            case 'create_payment_voucher':
                                const disbursementForVoucher = disbursements.find(d => d.disbursement_id === args.request_id);
                                if (!disbursementForVoucher) throw new Error(`لم يتم العثور على طلب بالرقم ${args.request_id}`);
                                if(disbursementForVoucher.status !== DisbursementStatus.Approved) throw new Error(`لا يمكن إنشاء سند إلا لطلب معتمد.`);
                                await addPaymentVoucher({
                                    request_id: args.request_id,
                                    date: new Date().toISOString().split('T')[0],
                                    disbursement_type: disbursementForVoucher.disbursement_type,
                                    amount: disbursementForVoucher.amount,
                                    beneficiary: disbursementForVoucher.beneficiary,
                                    purpose: disbursementForVoucher.purpose,
                                    payment_method: args.payment_method as PaymentMethod,
                                    notes: args.notes || '',
                                });
                                break;
                            case 'approve_payment_voucher':
                            case 'reject_payment_voucher':
                                const voucherToUpdate = paymentVouchers.find(v => v.request_id === args.request_id);
                                if (!voucherToUpdate) throw new Error(`لم يتم العثور على سند متعلق بالطلب رقم ${args.request_id}`);
                                const newVoucherStatus = name === 'approve_payment_voucher' ? PaymentVoucherStatus.Approved : PaymentVoucherStatus.Rejected;
                                await updatePaymentVoucherStatus(voucherToUpdate, newVoucherStatus);
                                break;
                            default:
                                throw new Error(`وظيفة غير معروفة: ${name}`);
                        }
                    } catch (e: any) {
                        resultMessage = `فشل التنفيذ: ${e.message}`;
                        showNotification(resultMessage, 'error');
                    }
                    setMessages(prev => [...prev, { text: resultMessage, sender: 'bot' }]);
                }
            } else {
                const botMessage = { text: response.text, sender: 'bot' as 'bot' };
                setMessages(prev => [...prev, botMessage]);
            }
        } catch (error) {
            console.error("Error calling AI API:", error);
            const errorMessage = { text: "عذراً، حدث خطأ أثناء الاتصال بالمساعد الذكي.", sender: 'bot' as 'bot' };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };
    
    if (!isOpen) {
        return (
             <button
                onClick={toggleAssistant}
                className="no-print fixed bottom-6 left-6 z-40 bg-teal-500 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-600 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                title="المساعد الذكي سالم"
            >
                <HeartIcon className="h-7 w-7" />
            </button>
        );
    }

    return (
        <div className="no-print fixed bottom-6 left-6 z-50 w-80 h-[28rem] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col transition-all">
            <header className="flex justify-between items-center p-4 bg-teal-500 text-white rounded-t-xl">
                <h3 className="font-bold">المساعد الذكي سالم</h3>
                <button onClick={toggleAssistant} className="p-1 rounded-full hover:bg-black/20">
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </header>
            <div className="flex-1 p-4 overflow-y-auto">
                 <div className="space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs p-3 rounded-lg ${msg.sender === 'user' ? 'bg-teal-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'}`}>
                                <p className="text-sm" style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                             <div className="max-w-xs p-3 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                                 <p className="animate-pulse text-sm">يفكر...</p>
                             </div>
                         </div>
                    )}
                    <div ref={messagesEndRef} />
                 </div>
            </div>
            <div className="p-4 border-t dark:border-gray-700">
                <div className="flex items-center">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSend()}
                        placeholder="اسأل سالم..."
                        className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        disabled={isLoading}
                    />
                    <button onClick={handleSend} disabled={isLoading || !input.trim()} className="mr-2 p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-400">
                        <PaperAirplaneIcon className="h-5 w-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiAssistant;