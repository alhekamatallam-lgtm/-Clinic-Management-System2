import React, { useState, useRef, useEffect, useMemo } from 'react';
import { HeartIcon, PaperAirplaneIcon, XMarkIcon, MicrophoneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/solid';
import { GoogleGenAI, Chat, FunctionDeclaration, Type, Part } from "@google/genai";
import { useApp } from '../../contexts/AppContext';
import { documentationData, DocSection } from '../../data/documentationData';
import { VisitType, Diagnosis, Role, User, Visit } from '../../types';

interface Message {
    text: string;
    isUser: boolean;
    quickReplies?: { label: string; value: string }[];
}

// Helper function to stringify the documentation for the AI context
const formatDocumentation = (sections: DocSection[], level = 0): string => {
    return sections.map(section => {
        const title = `${'#'.repeat(level + 1)} ${section.title}`;
        const content = section.content;
        const subsections = section.subsections ? formatDocumentation(section.subsections, level + 1) : '';
        return `${title}\n${content}\n\n${subsections}`;
    }).join('');
};

// Helper to get 'YYYY-MM-DD' from a Date object, respecting local timezone.
const getLocalYYYYMMDD = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const AiAssistant: React.FC = () => {
    const { user, clinics, doctors, visits, diagnoses, patients, revenues, addPatient, addOptimization, addVisit, addManualRevenue, addDiagnosis, addUser, showNotification, setReportTargetVisitId } = useApp();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatRef = useRef<Chat | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [apiKeyStatus, setApiKeyStatus] = useState<'unknown' | 'valid' | 'invalid' | 'quota_exceeded'>('unknown');


    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);
    
    useEffect(() => {
        // Auto-focus the input field after the assistant responds or when the chat opens.
        if (!isLoading && isOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isLoading, isOpen, messages]);

    const addOptimizationTool: FunctionDeclaration = {
        name: 'addOptimizationSuggestion',
        description: 'يضيف اقتراحًا للتحسين إلى النظام بناءً على ملاحظات المستخدم.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                suggestionText: {
                    type: Type.STRING,
                    description: 'ملخص واضح لمشكلة المستخدم أو اقتراحه.',
                },
            },
            required: ['suggestionText'],
        },
    };
    
    const addPatientTool: FunctionDeclaration = {
        name: 'addPatient',
        description: 'يضيف مريضًا جديدًا إلى النظام. استخدم هذه الأداة فقط بعد أن يؤكد المستخدم رغبته في إضافة مريض جديد ويوفر التفاصيل اللازمة.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمريض الجديد.',
                },
                phone: {
                    type: Type.STRING,
                    description: 'رقم هاتف المريض الجديد.',
                },
                dob: { // Date of birth
                    type: Type.STRING,
                    description: 'تاريخ ميلاد المريض بتنسيق YYYY-MM-DD. هذا الحقل إلزامي.',
                },
                gender: {
                    type: Type.STRING,
                    description: "جنس المريض، يجب أن يكون إما 'ذكر' أو 'أنثى'. هذا الحقل إلزامي.",
                },
            },
            required: ['name', 'phone', 'dob', 'gender'],
        },
    };

    const addVisitAndRevenueTool: FunctionDeclaration = {
        name: 'addVisitAndRevenue',
        description: 'يقوم بتسجيل زيارة جديدة للمريض وتسجيل الإيراد المقابل لها. استخدم هذه الأداة فقط عندما يؤكد المستخدم جميع التفاصيل (اسم المريض، اسم العيادة، نوع الزيارة، والتاريخ والوقت الاختياريين).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                patientName: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمريض كما هو مسجل في النظام.',
                },
                clinicName: {
                    type: Type.STRING,
                    description: 'اسم العيادة التي سيقوم المريض بزيارتها.',
                },
                visitType: {
                    type: Type.STRING,
                    description: `نوع الزيارة. يجب أن يكون إما '${VisitType.FirstVisit}' أو '${VisitType.FollowUp}'.`,
                },
                visitDate: {
                    type: Type.STRING,
                    description: 'التاريخ المطلوب للحجز بتنسيق YYYY-MM-DD. إذا لم يتم تحديده، سيتم استخدام تاريخ اليوم.',
                },
                visitTime: {
                    type: Type.STRING,
                    description: 'الوقت المحدد للزيارة بتنسيق HH:MM (24 ساعة). هذا الحقل اختياري.',
                },
                discount: {
                    type: Type.NUMBER,
                    description: 'قيمة الخصم المطلوب تطبيقها على سعر الزيارة. هذا الحقل اختياري، والقيمة الافتراضية هي 0.',
                },
            },
            required: ['patientName', 'clinicName', 'visitType'],
        },
    };
    
    const addDiagnosisForVisitTool: FunctionDeclaration = {
        name: 'addDiagnosisForVisit',
        description: 'يقوم بتسجيل تشخيص طبي لزيارة مريض محددة. لا تستخدم هذه الأداة إلا إذا كان المستخدم طبيباً وقام بتأكيد جميع تفاصيل التشخيص.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                visitId: {
                    type: Type.NUMBER,
                    description: 'الرقم التعريفي (ID) للزيارة التي يتم تشخيصها.',
                },
                diagnosisText: {
                    type: Type.STRING,
                    description: 'النص الكامل للتشخيص الطبي.',
                },
                prescriptionText: {
                    type: Type.STRING,
                    description: 'النص الكامل للوصفة الطبية والعلاج.',
                },
                labsNeededText: {
                    type: Type.STRING,
                    description: 'قائمة بالفحوصات أو التحاليل المطلوبة، مفصولة بفاصلة. مثال: "صورة دم كاملة, تحليل سكر".',
                },
                notesText: {
                    type: Type.STRING,
                    description: 'أي ملاحظات إضافية من الطبيب. هذا الحقل اختياري.',
                },
            },
            required: ['visitId', 'diagnosisText', 'prescriptionText'],
        },
    };
    
    const addUserTool: FunctionDeclaration = {
        name: 'addUser',
        description: 'يقوم بإنشاء مستخدم جديد بصلاحية مدير، موظف استقبال، أو شاشة عرض. لا يمكن استخدام هذه الأداة لإنشاء حسابات أطباء.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمستخدم الجديد.',
                },
                username: {
                    type: Type.STRING,
                    description: 'اسم المستخدم لتسجيل الدخول (يجب أن يكون فريداً).',
                },
                password: {
                    type: Type.STRING,
                    description: 'كلمة المرور للمستخدم الجديد.',
                },
                role: {
                    type: Type.STRING,
                    description: `صلاحية المستخدم. يجب أن تكون واحدة من: 'manager', 'reception', 'queuescreen'.`,
                },
            },
            required: ['name', 'username', 'password', 'role'],
        },
    };
    
    const viewPastDiagnosesTool: FunctionDeclaration = {
        name: 'viewPastDiagnoses',
        description: "يعرض التشخيصات السابقة لمريض معين.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                patientName: {
                    type: Type.STRING,
                    description: "اسم المريض المطلوب عرض سجل تشخيصاته.",
                },
            },
            required: ['patientName'],
        },
    };
    
    const findPatientVisitsTool: FunctionDeclaration = {
        name: 'findPatientVisits',
        description: 'يبحث عن جميع الزيارات المسجلة لمريض معين والتي تحتوي على تشخيص، ويعرضها للمستخدم ليختار منها.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                patientName: {
                    type: Type.STRING,
                    description: 'الاسم الكامل للمريض المطلوب البحث عن زياراته.',
                },
            },
            required: ['patientName'],
        },
    };

    const generateMedicalReportTool: FunctionDeclaration = {
        name: 'generateMedicalReport',
        description: "يطبع التقرير الطبي لزيارة معينة بعد أن يتم تحديد رقمها بشكل مؤكد. لا تستخدم هذه الأداة إلا بعد أن يختار المستخدم رقم زيارة محدد من قائمة تم عرضها عليه.",
        parameters: {
            type: Type.OBJECT,
            properties: {
                visitId: {
                    type: Type.NUMBER,
                    description: "الرقم التعريفي (ID) للزيارة المطلوب إنشاء تقرير لها.",
                },
            },
            required: ['visitId'],
        },
    };

    const systemContext = useMemo(() => {
        const documentationContext = formatDocumentation(documentationData);
        const today = getLocalYYYYMMDD(new Date());

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = getLocalYYYYMMDD(yesterday);
        const yesterdayVisits = visits.filter(v => v.visit_date === yesterdayStr);
        const yesterdayVisitorsCount = yesterdayVisits.length;
        const yesterdayVisitorNames = yesterdayVisits.map(v => {
            const patient = patients.find(p => p.patient_id === v.patient_id);
            return patient ? patient.name : 'مريض غير معروف';
        }).join(', ');
        
        const yesterdayInfo = `
معلومات الأمس (${yesterdayStr}):
- إجمالي عدد الزوار: ${yesterdayVisitorsCount} زائر.
- قائمة أسماء زوار الأمس: ${yesterdayVisitorNames || 'لا يوجد'}.
`;
        
        const patientListForContext = patients.map(p => `- ID: ${p.patient_id}, Name: ${p.name}, Phone: ${p.phone}`).join('\n');
        
        const waitingCountsByClinic = clinics.reduce((acc, clinic) => {
            const count = visits.filter(v => 
                v.clinic_id === clinic.clinic_id && 
                v.visit_date === today && 
                (v.status === 'Waiting' || v.status === 'In Progress') &&
                !diagnoses.some(d => d.visit_id === v.visit_id)
            ).length;
            acc[clinic.clinic_id] = count;
            return acc;
        }, {} as {[key: number]: number});

        const clinicsDoctorsList = clinics.map(clinic => {
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
            const waitingCount = waitingCountsByClinic[clinic.clinic_id] || 0;
            return `- Clinic Name: "${clinic.clinic_name}", Doctor: "${doctor?.doctor_name || 'غير محدد'}", Price First Visit: ${clinic.price_first_visit}, Price Follow-up: ${clinic.price_followup}, Waiting Now: ${waitingCount}`;
        }).join('\n');
        
        const clinicsCount = clinics.length;
        const doctorsCount = doctors.length;
        const clinicsDoctorsInfo = `يوجد في النظام ${clinicsCount} عيادة و ${doctorsCount} طبيب. وهذه قائمة العيادات الحالية مع الأطباء والأسعار وحالة الانتظار:\n${clinicsDoctorsList}`;

        const totalWaiting = Object.values(waitingCountsByClinic).reduce((sum, count) => sum + count, 0);
        const queueInfo = `يوجد حالياً ${totalWaiting} مريض في قوائم الانتظار الإجمالية. إذا سألك المستخدم عن قائمة الانتظار، قدم له ملخصًا يوضح عدد المنتظرين في كل عيادة.`;

        const todaysRevenues = revenues.filter(r => r.date === today);
        const totalTodaysRevenue = todaysRevenues.reduce((sum, r) => sum + r.amount, 0);
        
        const todaysVisits = visits.filter(v => v.visit_date === today);

        const detailedRevenueByClinic = clinics.map(clinic => {
            const clinicRevenues = todaysRevenues.filter(r => r.clinic_id === clinic.clinic_id);
            const totalClinicRevenue = clinicRevenues.reduce((sum, r) => sum + r.amount, 0);
            const clinicVisitors = todaysVisits.filter(v => v.clinic_id === clinic.clinic_id).length;
            const doctor = doctors.find(d => d.doctor_id === clinic.doctor_id);
            return `- عيادة ${clinic.clinic_name} (د. ${doctor?.doctor_name || 'غير محدد'}): الإيراد ${totalClinicRevenue.toFixed(2)} ريال، عدد الزوار ${clinicVisitors}`;
        }).join('\n');

        const revenueInfo = `إجمالي إيرادات اليوم هو ${totalTodaysRevenue.toFixed(2)} ريال.
إذا سألك المستخدم عن إيرادات اليوم، قم أولاً بتقديم هذا الإجمالي. ثم اسأله: "هل تريد تفصيلاً حسب العيادة؟".
إذا أجاب المستخدم بنعم أو طلب تفاصيل الإيرادات، قدم له الملخص التالي:
${detailedRevenueByClinic || 'لا توجد إيرادات أو زيارات مسجلة اليوم.'}
للحصول على تقارير إيرادات تاريخية أو أكثر تفصيلاً، يجب على المستخدمين زيارة صفحة التقارير.`;
        
        const bookingPermissions = `
--- صلاحيات وإجراءات الحجز (للمدير والاستقبال) ---
- فقط المستخدمون بصلاحيات 'manager' و 'reception' يمكنهم حجز المواعيد. إذا حاول مستخدم آخر (مثل 'doctor') إجراء حجز، أبلغه بلطف أن هذه المهمة من اختصاص موظف الاستقبال أو المدير.
- عند طلب حجز موعد، اتبع **دائماً** هذا الحوار المتدرج ولا تطلب كل المعلومات دفعة واحدة:
1.  **ابدأ بسؤال المريض:** اسأل "لمن تريد الحجز؟ ما هو اسم المريض أو رقم هاتفه؟".
2.  **التحقق من هوية المريض:** بعد الحصول على الإدخال (سواء كان اسمًا أو رقم هاتف)، ابحث في قائمة المرضى التي تم تزويدك بها.
    - **إذا كان الإدخال رقم هاتف:** ابحث عن تطابق تام في أرقام الهواتف. إذا وجدت، قل "وجدت المريض [اسم المريض] المرتبط بهذا الرقم. هل هذا صحيح؟". إذا أكد المستخدم، انتقل إلى الخطوة 4.
    - **إذا كان الإدخال اسمًا:** ابحث عن تطابق تام أو مشابه جدًا (لمراعاة الأخطاء الإملائية مثل "فطامة" بدلاً من "فاطمة"). إذا وجدت تطابقًا محتملًا، قل "لم أجد تطابقًا تامًا، هل تقصد '[اسم المريض المشابه]'؟". إذا أكد المستخدم، انتقل إلى الخطوة 4.
    - **إذا لم تجد أي تطابق:** انتقل إلى الخطوة 3.
3.  **التعامل مع المريض غير الموجود:**
    - **اسأل عن الإضافة:** قل "لم أتمكن من العثور على المريض. هل ترغب في تسجيله كمريض جديد؟".
    - **إذا وافق المستخدم:** اطلب المعلومات الضرورية بشكل متسلسل. ابدأ بـ: "حسنًا. ما هو رقم هاتف المريض؟". بعد الحصول على رقم الهاتف، اسأل: "وما هو تاريخ ميلاده؟". بعد الحصول على تاريخ الميلاد، اسأل: "وما هو جنس المريض، ذكر أم أنثى؟". بعد الحصول على كل المعلومات (الاسم، الهاتف، تاريخ الميلاد، والجنس)، استدعِ أداة 'addPatient' بهذه البيانات، ثم قل "ممتاز، تمت إضافة المريض بنجاح. لنكمل الحجز. في أي عيادة؟" وانتقل للخطوة 4.
    - **إذا رفض المستخدم:** قل "حسنًا، لا يمكن المتابعة بدون تحديد مريض. هل هناك شيء آخر أستطيع المساعدة به؟" وأنهِ محاولة الحجز.
4.  **بعد تأكيد اسم المريض، اسأل عن العيادة أو الطبيب:** قل "تمام. في أي عيادة أو مع أي طبيب تود الحجز؟".
5.  **تحديد العيادة وتأكيد الطبيب:**
    - **إذا ذكر المستخدم اسم طبيب (مثل "محمد شاهين"):** ابحث في قائمة العيادات للعثور على العيادة المرتبطة بهذا الطبيب. إذا لم تجده، قل "عذراً، لم أجد طبيباً بهذا الاسم." إذا وجدته، قل "أتفهم قصدك. بناءً على معلوماتي، الطبيب [اسم الطبيب] مرتبط بـ [اسم العيادة].". ثم انتقل مباشرةً لتأكيد حالة الانتظار (الخطوة التالية).
    - **إذا ذكر المستخدم اسم عيادة:** ابحث عن الطبيب المرتبط بهذه العيادة. استخدم الاسم الدقيق من حقل "Clinic Name" في قائمة العيادات أعلاه عند استدعاء الأداة.
6.  **الإبلاغ بحالة الانتظار:** بعد تحديد العيادة والطبيب، قل: "يوجد حاليًا [عدد] مرضى في قائمة الانتظار لعيادة [اسم العيادة] مع الطبيب [اسم الطبيب]. هل نواصل الحجز؟".
7.  **بعد تأكيد المتابعة، اسأل عن نوع الزيارة:** قل "ممتاز. ما هو نوع الزيارة، كشف جديد أم متابعة؟".
8.  **اسأل عن التاريخ والوقت (إذا لزم الأمر):** إذا لم يذكر المستخدم تاريخًا، افترض أنه اليوم. اسأل "هل ترغب في تحديد وقت معين؟" إذا كان ذلك مناسبًا.
9.  **تأكيد السعر والسؤال عن الخصم:** بعد تحديد نوع الزيارة، أبلغ المستخدم بسعرها بناءً على قائمة أسعار العيادات. قل: "سعر [نوع الزيارة] هو [السعر] ريال. هل يوجد أي خصم؟". إذا قدم المستخدم خصماً، قم بتدوينه. إذا قال لا أو لم يذكر، اعتبر الخصم 0.
10. **قبل التنفيذ، لخص واطلب التأكيد النهائي:** قل "حسناً، للمراجعة: سيتم حجز موعد لـ [اسم المريض] في عيادة [اسم العيادة] كـ '[نوع الكشف]' بتاريخ [التاريخ]. سعر الكشف [السعر] ريال، وبعد خصم [الخصم] ريال، المبلغ المطلوب هو [المبلغ النهائي] ريال. هل أؤكد الحجز؟".
11. **عند الحصول على التأكيد فقط،** قم باستدعاء أداة 'addVisitAndRevenue'. بعد استدعاء الأداة بنجاح، أبلغ المستخدم بالنجاح ورقم الانتظار، ثم اسأله: "هل ترغب الآن في طباعة تقرير طبي لهذه الزيارة؟". إذا وافق، استدعِ أداة 'generateMedicalReport' باستخدام رقم الزيارة (visitId) الذي تم إنشاؤه.
`;

        const revenuePermissions = `
--- صلاحيات الإيرادات ---
- المستخدمون بصلاحيات 'manager' و 'reception' يمكنهم الاستعلام عن ملخص إيرادات اليوم لجميع العيادات. إذا سألوا، قدم لهم الإجمالي أولاً ثم اسأل إذا كانوا يريدون تفصيلاً حسب العيادة.
- المستخدم بصلاحية 'doctor' يمكنه الاستعلام عن إيرادات عياداته **الخاصة به فقط** لهذا اليوم. عندما يسأل الطبيب عن إيراداته، استخدم المعلومات الموجودة في قسم "صلاحيات ومهام الطبيب" لتزويده بالإجابة مباشرةً، ولا تسأله إذا كان يريد تفصيلاً.
- للحصول على تقارير إيرادات مفصلة أو تاريخية لأي صلاحية، يجب على المستخدمين زيارة صفحة التقارير.
`;

        const historicalDataPermissions = `
--- صلاحيات البيانات السابقة ---
- يمكنك الوصول إلى بيانات يوم أمس فقط (العدد والأسماء) كما هو موضح في "بيانات النظام الحية".
- إذا سألك المستخدم "كم عدد زوار أمس؟"، أجب بالعدد الإجمالي.
- إذا سألك المستخدم "من هم زوار أمس؟" أو "اطلعني على زوار أمس"، قدم له قائمة الأسماء التي تم تزويدك بها.
- إذا سألك المستخدم عن أي بيانات تاريخية أقدم من يوم أمس (مثل "الأسبوع الماضي" أو تاريخ محدد)، أجب بأن هذه التفاصيل متوفرة فقط في صفحة التقارير ولا يمكنك الوصول إليها مباشرة.
`;

        const queueScreenPermissions = `
--- صلاحيات شاشة عرض الانتظار (queuescreen) ---
- هذه الصلاحية مخصصة للعرض فقط.
- المستخدم الذي يمتلك هذه الصلاحية يرى فقط شاشة الانتظار العامة للمرضى.
- هذا المستخدم لا يمكنه التفاعل مع النظام أو إجراء أي تغييرات. دوره هو عرض قائمة الانتظار على شاشة في منطقة استقبال المرضى.
- هذا المستخدم لا يمكنه التفاعل معك (سالم).
`;
        
        const userManagementPermissions = `
--- صلاحيات إدارة المستخدمين (للمدير) ---
- بصفتك مديرًا، يمكنك إضافة مستخدمين جدد (باستثناء الأطباء).
- عند طلب إضافة مستخدم، اجمع التفاصيل: الاسم الكامل، اسم المستخدم، كلمة المرور، والصلاحية.
- الصلاحيات المتاحة للإضافة عبر المساعد هي: 'manager' (مدير), 'reception' (موظف استقبال), 'queuescreen' (شاشة عرض الانتظار).
- **مهم جداً:** لا تقم بإنشاء حسابات "طبيب". يجب على المدير إنشاء حسابات الأطباء من صفحة "إدارة المستخدمين" لضمان ربطها بالطبيب والعيادة بشكل صحيح. إذا طُلب منك إضافة طبيب، اعتذر وأرشد المدير إلى الصفحة الصحيحة.
- بعد جمع وتأكيد المعلومات، استدعِ أداة 'addUser'.
`;
        
        const patientInteractionInstructions = `
--- استعلامات المرضى ---
- عندما يسأل المستخدم عن مريض معين (مثل "من هو مصطفى أحمد؟")، ابحث عنه في قائمة المرضى وقدم معلوماته الأساسية (مثال: "المريض مصطفى احمد حلمي ورقمه هو 10101010.").
- **مهم جداً:** مباشرة بعد تقديم معلومات المريض، اسأله دائمًا: "هل تريد عرض تشخيصاته السابقة؟".
- **الأهم:** إذا كانت إجابة المستخدم التالية هي "نعم"، "اعرضها"، "أكيد"، أو أي تأكيد إيجابي آخر، يجب عليك **فورًا** ودون طرح أي سؤال آخر، استدعاء أداة 'viewPastDiagnoses' باسم المريض الذي كنت تتحدث عنه للتو (في هذا المثال، 'مصطفى احمد حلمي'). لا تقل "لمن؟" أو "ما اسم المريض؟". حافظ على سياق المحادثة.
- إذا سأل عن تسجيل زيارة، ابدأ حوار الحجز.
`;
        
        const medicalReportInstructions = `
--- إجراءات طباعة التقارير الطبية ---
- الهدف هو طباعة تقرير لزيارة معينة.
- **مهم جداً:** لا تسأل المستخدم أبداً عن "رقم الزيارة" أو "Visit ID" مباشرةً. من الصعب على المستخدمين معرفة هذا الرقم.
- اتبع هذا الحوار **بدقة**:
1.  **عندما يطلب المستخدم طباعة تقرير** (مثال: "اطبع تقرير يوسف عيسى" أو "أحتاج تقرير لآخر زيارة ليوسف عيسى").
2.  **استخدم أداة 'findPatientVisits' فوراً** مع اسم المريض. هذه الأداة ستبحث عن كل الزيارات التي لها تشخيص وتعرضها.
3.  **الرد من الأداة سيكون قائمة بالزيارات.** ستقوم أنت بعرض هذه القائمة على المستخدم.
4.  **اسأل المستخدم ليختار.** قل له: "وجدت هذه الزيارات، يرجى اختيار رقم الزيارة المطلوب لطباعة تقريرها".
5.  **بعد أن يختار المستخدم رقماً** (مثال: "اطبع رقم 123" أو "الزيارة الثانية").
6.  **فقط في هذه المرحلة،** استدعِ أداة 'generateMedicalReport' باستخدام رقم الزيارة الذي اختاره المستخدم.
- **إذا قال المستخدم "آخر زيارة":** بعد استخدام 'findPatientVisits'، الأداة ستعيد الزيارات مرتبة من الأحدث إلى الأقدم. يمكنك أن تسأل المستخدم للتأكيد: "هل تقصد الزيارة بتاريخ [تاريخ أحدث زيارة]؟". إذا أكد، استدعِ 'generateMedicalReport' بالرقم المقابل.
- لا تفترض أي شيء. دائماً اعرض الخيارات ودع المستخدم يختار.
`;

        let doctorContext = '';
        if (user?.role === 'doctor' && user.doctor_id) {
            const doctorClinics = clinics.filter(c => c.doctor_id === user.doctor_id);
            const doctorClinicIds = doctorClinics.map(c => c.clinic_id);

            const doctorWaitingVisits = visits.filter(v =>
                doctorClinicIds.includes(v.clinic_id) &&
                v.visit_date === today &&
                (v.status === 'Waiting' || v.status === 'In Progress') &&
                !diagnoses.some(d => d.visit_id === v.visit_id)
            ).sort((a, b) => a.queue_number - b.queue_number);

            const doctorWaitingVisitsCount = doctorWaitingVisits.length;

            const waitingListForContext = doctorWaitingVisits.map(v => {
                const patient = patients.find(p => p.patient_id === v.patient_id);
                return `- Visit ID: ${v.visit_id}, Patient: ${patient?.name || 'غير معروف'}, Queue: ${v.queue_number}`;
            }).join('\n');

            const nextPatientInfo = doctorWaitingVisits.length > 0
                ? `المريض التالي في قائمة الانتظار هو "${patients.find(p => p.patient_id === doctorWaitingVisits[0].patient_id)?.name || 'غير معروف'}" (رقم الزيارة: ${doctorWaitingVisits[0].visit_id}).`
                : "لا يوجد مرضى في قائمة الانتظار حالياً.";
            
            const doctorTodaysRevenues = todaysRevenues.filter(r => doctorClinicIds.includes(r.clinic_id));
            const totalDoctorTodaysRevenue = doctorTodaysRevenues.reduce((sum, r) => sum + r.amount, 0);
            const doctorTodaysVisitsCount = todaysVisits.filter(v => doctorClinicIds.includes(v.clinic_id)).length;

            const doctorRevenueInfo = `
- بصفتك طبيباً، يمكنك أيضاً الاستعلام عن إيرادات عيادتك لليوم.
- إجمالي إيرادات عيادتك اليوم: ${totalDoctorTodaysRevenue.toFixed(2)} ريال.
- إجمالي عدد الزوار في عيادتك اليوم: ${doctorTodaysVisitsCount} زائر.
`;

            doctorContext = `
--- صلاحيات ومهام الطبيب ---
- بصفتك طبيباً، يمكنك استخدامي للمساعدة في تسجيل التشخيصات. يمكنك أن تطلب مني "تسجيل تشخيص للزيارة رقم 123" أو "اكتب تشخيص للمريض التالي".
- سأقوم بسؤالك عن تفاصيل التشخيص (التشخيص، الوصفة، التحاليل، الملاحظات).
- بعد أن تزودني بالمعلومات، سألخصها لك للتأكيد. بعد تأكيدك، سأقوم بحفظ التشخيص باستخدام أداة 'addDiagnosisForVisit'.
${doctorRevenueInfo}
- يوجد في قائمة الانتظار الخاصة بك حالياً: ${doctorWaitingVisitsCount} مرضى.
- ${nextPatientInfo}
- إليك قائمة الانتظار الكاملة الخاصة بك لهذا اليوم:
${waitingListForContext || 'لا يوجد مرضى في الانتظار.'}
- عندما يسألك الطبيب "من التالي؟" أو "من الأول؟"، أجب مباشرة بالمعلومات من 'المريض التالي'. لا تطلب منه مراجعة لوحة التحكم لهذه المعلومة.
- يمكنك استخدام رقم الزيارة (Visit ID) من القائمة أعلاه عند استدعاء أداة 'addDiagnosisForVisit'.
`;
        }
        
        const baseInstructions = `أنت سالم، مساعد ذكي ونشيط وفعال في نظام إدارة عيادة، ولديك الصلاحيات الكافية للقيام بمهامك. مهمتك هي مساعدة المستخدمين من خلال الإجابة على أسئلتهم وتنفيذ المهام بناءً على صلاحياتهم. المستخدم الحالي هو: ${user?.role}.
أجب دائمًا باللغة العربية وبإيجاز ووضوح. استخدم المعلومات التالية فقط كمصدر لمعلوماتك والتزم بالصلاحيات الموضحة في الأقسام المخصصة لكل دور.

--- وثائق النظام ---
${documentationContext}
--- نهاية الوثائق ---

--- بيانات النظام الحية ---
تاريخ اليوم: ${today}
${yesterdayInfo}
قائمة المرضى المسجلين (لأغراض البحث والحجز):
${patientListForContext}
العيادات والأطباء:
${clinicsDoctorsInfo}
قائمة الانتظار العامة:
${queueInfo}
الإيرادات (معلومات سرية):
${revenueInfo}
--- نهاية بيانات النظام الحية ---
`;
        const functionCallingInstructions = `
--- تعليمات الأدوات ---
- أداة 'addOptimizationSuggestion': عندما يقدم المستخدم اقتراحًا لتحسين النظام، اسأله إذا كان يرغب في تسجيله رسمياً. إذا وافق، قم باستدعاء الأداة.
- أداة 'addPatient': استخدمها لإضافة مريض جديد بعد أن يؤكد المستخدم رغبته بذلك ويقدم رقم الهاتف.
- أداة 'addVisitAndRevenue': استخدمها لتسجيل زيارة وإيراد بعد تأكيد المستخدم.
- أداة 'addDiagnosisForVisit': استخدمها لتسجيل تشخيص بعد تأكيد الطبيب.
- أداة 'addUser': استخدمها لإضافة مستخدم جديد بعد تأكيد المدير.
- أداة 'viewPastDiagnoses': استخدمها عندما يسأل المستخدم عن "سجل" أو "تشخيصات سابقة" لمريض.
- أداة 'findPatientVisits': استخدمها للبحث عن زيارات مريض معين عندما يطلب المستخدم طباعة تقرير.
- أداة 'generateMedicalReport': استخدمها لطباعة تقرير طبي بعد أن يختار المستخدم رقم زيارة محدد من القائمة.
--- نهاية تعليمات الأدوات ---`;

        return `${baseInstructions}\n${patientInteractionInstructions}\n${bookingPermissions}\n${medicalReportInstructions}\n${revenuePermissions}\n${historicalDataPermissions}\n${userManagementPermissions}\n${queueScreenPermissions}\n${doctorContext}\n${functionCallingInstructions}`;

    }, [documentationData, clinics, doctors, visits, diagnoses, user, revenues, patients]);
    
    const initializeChat = async () => {
        setIsLoading(true);
        setApiKeyStatus('unknown');
        setMessages([]);

        try {
            const ai = new GoogleGenAI({ 
                apiKey: process.env.API_KEY!,
            });
            const tools: FunctionDeclaration[] = [addOptimizationTool];
             if (user?.role === 'manager' || user?.role === 'reception') {
                tools.push(addVisitAndRevenueTool, addPatientTool);
            }
            if (user?.role === 'manager') {
                tools.push(addUserTool);
            }
            if (user?.role === 'doctor') {
                tools.push(addDiagnosisForVisitTool);
            }
            if (user?.role === 'manager' || user?.role === 'reception' || user?.role === 'doctor') {
                tools.push(viewPastDiagnosesTool, generateMedicalReportTool, findPatientVisitsTool);
            }

            const chat = ai.chats.create({
                model: 'gemini-2.5-flash',
                config: {
                    systemInstruction: systemContext,
                    tools: [{ functionDeclarations: tools }],
                },
            });
            chatRef.current = chat;
            // Send a test message to validate the API key and setup
            await chat.sendMessage({ message: 'مرحبا' }); 

            setApiKeyStatus('valid');
            setMessages([{ text: `مرحباً ${user?.Name}! أنا سالم، مساعدك الذكي لإدارة العيادة. كيف يمكنني المساعدة اليوم؟`, isUser: false }]);
        } catch (e: any) {
            console.error("Failed to initialize AI Chat:", e);
            const errorMessage = e.message ? e.message.toLowerCase() : '';
             if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota')) {
                setApiKeyStatus('quota_exceeded');
            } else if (errorMessage.includes('api key') || errorMessage.includes('permission') || errorMessage.includes('billing') || errorMessage.includes('not found')) {
                setApiKeyStatus('invalid');
            } else {
                setMessages([{ text: "عذرًا، لم أتمكن من بدء المحادثة. يرجى المحاولة مرة أخرى.", isUser: false }]);
            }
        } finally {
            setIsLoading(false);
        }
    };
    
    useEffect(() => {
        if (isOpen) {
            initializeChat();
        } else {
            chatRef.current = null;
        }
    }, [isOpen, user, systemContext]);

    const handleSend = async (textOverride?: string) => {
        const messageText = textOverride || input;
        if (!messageText.trim() || isLoading || !chatRef.current) return;
    
        let finalMessageToSend = messageText;
        const lastAiMessage = messages.length > 0 ? messages[messages.length - 1] : null;
        const positiveResponses = ['نعم', 'ايوه', 'اي', 'yes', 'ok', 'اعرضها', 'أكيد', 'نعم، اعرضها', 'اعرض التشخيص', 'التشخيص', 'اعرض'];
    
        if (
            lastAiMessage &&
            !lastAiMessage.isUser &&
            lastAiMessage.text.includes('هل تريد عرض تشخيصاته السابقة؟') &&
            positiveResponses.includes(messageText.trim().toLowerCase())
        ) {
            // Extract patient name from the last AI message to maintain context
            const patientNameMatch = lastAiMessage.text.match(/المريض ([^\d]+?)\s*ورقمه/);
            const patientNameMatch2 = lastAiMessage.text.match(/هل تقصد (.*?)\?/);
            const patientName = patientNameMatch ? patientNameMatch[1].trim() : (patientNameMatch2 ? patientNameMatch2[1].trim() : null);

            if (patientName) {
                // Rephrase the user's simple "yes" into a more explicit command for the AI
                finalMessageToSend = `اعرض التشخيصات السابقة للمريض ${patientName}`;
                setLoadingMessage(`جاري جلب تشخيصات ${patientName}...`);
            } else {
                setLoadingMessage('انتظر قليلاً، جاري جلب التشخيص...');
            }
        }

        const userMessage: Message = { text: messageText, isUser: true };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);
    
        try {
            const response = await chatRef.current.sendMessage({ message: finalMessageToSend });
    
            if (response.functionCalls && response.functionCalls.length > 0) {
                const functionResponseParts: Part[] = [];
                let lastSuccessfulResultText: string | null = null;
                let anyErrors = false;
    
                for (const fc of response.functionCalls) {
                    let toolResult: object | undefined;
    
                    try {
                        if (fc.name === 'addOptimizationSuggestion') {
                            const { suggestionText } = fc.args;
                            if (suggestionText && user) {
                                await addOptimization({ user: user.username, name: user.Name, page: 'المساعد سالم', optimize: suggestionText });
                                toolResult = { result: "تم تسجيل اقتراحك بنجاح. شكراً لك!" };
                            }
                        } else if (fc.name === 'addPatient') {
                            const { name, phone, dob, gender } = fc.args;
                            await addPatient({ name, phone, dob: dob || '', gender: gender || 'ذكر', address: '' });
                            toolResult = { result: `تمت إضافة المريض "${name}" بنجاح.` };
                        
                        } else if (fc.name === 'addVisitAndRevenue') {
                            const { patientName, clinicName, visitType, visitDate, visitTime, discount } = fc.args;
                            const today = getLocalYYYYMMDD(new Date());
    
                            const patient = patients.find(p => p.name.trim().toLowerCase() === patientName.trim().toLowerCase());
                            if (!patient) throw new Error(`لم أتمكن من العثور على مريض بالاسم "${patientName}".`);
    
                            const clinic = clinics.find(c => c.clinic_name.trim() === clinicName.trim());
                            if (!clinic) throw new Error(`لم أتمكن من العثور على عيادة بالاسم "${clinicName}".`);
    
                            const visitPrice = visitType === VisitType.FirstVisit ? clinic.price_first_visit : clinic.price_followup;
                            const finalAmount = Math.max(0, visitPrice - (discount || 0));
    
                            const createdVisit: Visit = await addVisit({
                                patient_id: patient.patient_id,
                                clinic_id: clinic.clinic_id,
                                visit_type: visitType,
                                visit_date: visitDate || today,
                                visit_time: visitTime || '',
                            });
    
                            await addManualRevenue({
                                visit_id: createdVisit.visit_id,
                                patient_id: patient.patient_id,
                                patient_name: patient.name,
                                clinic_id: clinic.clinic_id,
                                amount: finalAmount,
                                date: visitDate || today,
                                type: visitType,
                                notes: `تمت الإضافة بواسطة المساعد سالم`,
                            });
                            toolResult = { result: `تم حجز الموعد وتسجيل الإيراد بنجاح. رقم الانتظار هو ${createdVisit.queue_number}.`, visitId: createdVisit.visit_id };
    
                        } else if (fc.name === 'addDiagnosisForVisit') {
                            const { visitId, diagnosisText, prescriptionText, labsNeededText, notesText } = fc.args;
                            const diagnosisData: Omit<Diagnosis, 'diagnosis_id'> = {
                                visit_id: visitId,
                                doctor: user!.username,
                                diagnosis: diagnosisText,
                                prescription: prescriptionText,
                                labs_needed: labsNeededText ? labsNeededText.split(',').map((s: string) => s.trim()) : [],
                                notes: notesText || ''
                            };
                            await addDiagnosis(diagnosisData);
                            toolResult = { result: `تم حفظ التشخيص بنجاح.` };
    
                        } else if (fc.name === 'addUser') {
                            const { name, username, password, role } = fc.args;
                            await addUser({ Name: name, username, password, role: role as Role, status: 'مفعل' } as Omit<User, 'user_id'>);
                            toolResult = { result: `تمت إضافة المستخدم بنجاح.` };
                        } else if (fc.name === 'viewPastDiagnoses') {
                            const { patientName } = fc.args;
                            const patient = patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
                            if (!patient) {
                                toolResult = { result: `لم يتم العثور على مريض بالاسم "${patientName}".` };
                            } else {
                                const patientVisits = visits.filter(v => v.patient_id === patient.patient_id);
                                const patientVisitIds = new Set(patientVisits.map(v => v.visit_id));
                                const patientDiagnoses = diagnoses.filter(d => patientVisitIds.has(d.visit_id));
                                
                                if (patientDiagnoses.length === 0) {
                                    toolResult = { result: `لا توجد تشخيصات سابقة مسجلة للمريض "${patient.name}".` };
                                } else {
                                    const formattedDiagnoses = patientDiagnoses
                                        .map(diag => {
                                            const visit = patientVisits.find(v => v.visit_id === diag.visit_id);
                                            return `تاريخ: ${visit?.visit_date || 'غير معروف'}\nالتشخيص: ${diag.diagnosis}\nالعلاج: ${diag.prescription}`;
                                        })
                                        .join('\n---\n');
                                    toolResult = { result: `هذه هي التشخيصات السابقة للمريض "${patient.name}":\n\n${formattedDiagnoses}` };
                                }
                            }
                        } else if (fc.name === 'findPatientVisits') {
                            const { patientName } = fc.args;
                            const patient = patients.find(p => p.name.toLowerCase().includes(patientName.toLowerCase()));
                            if (!patient) {
                                toolResult = { result: `لم يتم العثور على مريض بالاسم "${patientName}".` };
                            } else {
                                const diagnosisVisitIds = new Set(diagnoses.map(d => d.visit_id));
                                const patientVisitsWithDiagnosis = visits
                                    .filter(v => v.patient_id === patient.patient_id && diagnosisVisitIds.has(v.visit_id))
                                    .sort((a, b) => new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime());

                                if (patientVisitsWithDiagnosis.length === 0) {
                                    toolResult = { result: `لا توجد زيارات مكتملة (بها تشخيص) مسجلة للمريض "${patient.name}".` };
                                } else {
                                    const formattedVisits = patientVisitsWithDiagnosis
                                        .map((visit, index) => {
                                            const clinic = clinics.find(c => c.clinic_id === visit.clinic_id);
                                            return `${index + 1}. زيارة بتاريخ ${visit.visit_date} في عيادة ${clinic?.clinic_name || 'غير معروفة'} (رقم الزيارة: ${visit.visit_id})`;
                                        })
                                        .join('\n');
                                    toolResult = { result: `هذه هي الزيارات المتاحة للطباعة للمريض "${patient.name}":\n\n${formattedVisits}\n\nيرجى تزويدي برقم الزيارة التي تود طباعة تقريرها.` };
                                }
                            }
                        } else if (fc.name === 'generateMedicalReport') {
                            const { visitId } = fc.args;
                            const visitExists = visits.some(v => v.visit_id === visitId);
                            if (visitExists) {
                                setReportTargetVisitId(visitId);
                                toolResult = { result: "تم تجهيز التقرير الطبي. سيتم عرضه الآن للطباعة." };
                            } else {
                                toolResult = { error: `لم يتم العثور على زيارة بالرقم التعريفي ${visitId}.` };
                            }
                        }
                    } catch (e: any) {
                        console.error(`Failed to execute tool ${fc.name}:`, e);
                        toolResult = { error: `فشل الإجراء: ${e.message}` };
                    }

                    // Safety check: ensure toolResult is always a valid object to prevent API errors.
                    if (toolResult === undefined) {
                        console.error(`Unknown function call received: ${fc.name}`);
                        toolResult = { error: `Function call "${fc.name}" is not a recognized tool.` };
                    }
    
                    functionResponseParts.push({
                        functionResponse: {
                            name: fc.name,
                            response: toolResult,
                        },
                    });
    
                    if ('result' in toolResult && typeof toolResult.result === 'string') {
                        lastSuccessfulResultText = toolResult.result;
                        showNotification(toolResult.result, 'success');
                    } else if ('error' in toolResult && typeof toolResult.error === 'string') {
                        anyErrors = true;
                        showNotification(toolResult.error, 'error');
                    }
                }
    
                const functionResponse = await chatRef.current.sendMessage({ message: functionResponseParts });
                
                if (functionResponse.text) {
                    setMessages(prev => [...prev, { text: functionResponse.text, isUser: false }]);
                } else if (lastSuccessfulResultText && !anyErrors) {
                     setMessages(prev => [...prev, { text: lastSuccessfulResultText, isUser: false }]);
                } else if (!anyErrors) {
                    setMessages(prev => [...prev, { text: "تم. هل هناك شيء آخر أستطيع المساعدة به؟", isUser: false }]);
                }
                
            } else if (response.text) {
                const aiMessageText = response.text;
                let quickReplies: { label: string; value: string }[] = [];
        
                const diagnosisQuestion = 'هل تريد عرض تشخيصاته السابقة؟';
                if (aiMessageText.includes(diagnosisQuestion)) {
                    quickReplies = [
                        { label: 'التشخيص', value: 'التشخيص' },
                        { label: 'لا', value: 'لا' }
                    ];
                } else {
                    const yesNoQuestions = [
                        'هل ترغب في تسجيله كمريض جديد؟',
                        'هل نواصل الحجز؟',
                        'هل أؤكد الحجز؟',
                        'هل تريد تفصيلاً حسب العيادة؟',
                        'هل ترغب في تسجيله رسمياً؟'
                    ];
                    
                    const reportQuestion = 'يرجى تزويدي برقم الزيارة التي تود طباعة تقريرها';
                    
                    if (!aiMessageText.includes(reportQuestion) && yesNoQuestions.some(q => aiMessageText.includes(q))) {
                        quickReplies = [
                            { label: 'نعم', value: 'نعم' },
                            { label: 'لا', value: 'لا' }
                        ];
                    }
                }
        
                const aiMessage: Message = { 
                    text: aiMessageText, 
                    isUser: false, 
                    quickReplies: quickReplies.length > 0 ? quickReplies : undefined 
                };
                setMessages(prev => [...prev, aiMessage]);
            }
        } catch (e: any) {
            console.error("Failed to send message:", e);
            const errorMessage = e.message ? e.message.toLowerCase() : '';
            if (errorMessage.includes('not found') || errorMessage.includes('api key') || errorMessage.includes('permission') || errorMessage.includes('billing')) {
                setApiKeyStatus('invalid');
            } else if (errorMessage.includes('429') || errorMessage.includes('resource_exhausted') || errorMessage.includes('quota')) {
                setApiKeyStatus('quota_exceeded');
            } else {
                setMessages(prev => [...prev, { text: "عذرًا، حدث خطأ. يرجى المحاولة مرة أخرى.", isUser: false }]);
            }
        } finally {
            setIsLoading(false);
            setLoadingMessage(null);
        }
    };


    useEffect(() => {
        if (!('webkitSpeechRecognition' in window)) {
            console.error("Speech Recognition not available");
            return;
        }

        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'ar-SA';

        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            handleSend(transcript);
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            console.error('Speech recognition error', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current = recognition;
    }, []);

    const handleListen = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
        } else {
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const renderChatContent = () => {
        if (isLoading && messages.length === 0) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-4">
                    <div className="w-8 h-8 border-4 border-dashed rounded-full animate-spin border-teal-500"></div>
                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">جاري تهيئة سالم...</p>
                </div>
            );
        }

        if (apiKeyStatus === 'invalid') {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <ExclamationTriangleIcon className="h-10 w-10 text-red-500 mb-2" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200">فشل في التحقق من مفتاح API</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        يبدو أن مفتاح API المستخدم غير صالح أو ليس لديه الصلاحيات اللازمة. يرجى التحقق من إعداداتك.
                    </p>
                </div>
            );
        }
        
        if (apiKeyStatus === 'quota_exceeded') {
             return (
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <ExclamationTriangleIcon className="h-10 w-10 text-yellow-500 mb-2" />
                    <p className="font-semibold text-gray-800 dark:text-gray-200">تم تجاوز الحصة المتاحة</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                        لقد استهلك مفتاح API الحالي حصته المتاحة. يمكنك مراجعة خطتك أو الانتظار حتى يتم تجديد الحصة.
                    </p>
                </div>
            );
        }


        return (
            <>
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                    {messages.map((msg, index) => (
                        <div key={index} className={`w-full flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex flex-col ${msg.isUser ? 'items-end' : 'items-start'}`}>
                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-xl ${msg.isUser ? 'bg-teal-500 text-white' : 'bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200'}`}>
                                    <p className="whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                {msg.quickReplies && !msg.isUser && index === messages.length - 1 && !isLoading && (
                                    <div className="flex justify-start mt-2 space-x-2 space-x-reverse">
                                        {msg.quickReplies.map((reply, i) => (
                                            <button
                                                key={i}
                                                onClick={() => handleSend(reply.value)}
                                                className="px-4 py-1.5 text-sm font-medium bg-white text-teal-700 border border-teal-300 rounded-full hover:bg-teal-50 dark:bg-gray-700 dark:text-teal-300 dark:border-teal-600 dark:hover:bg-gray-600 transition-colors shadow-sm"
                                            >
                                                {reply.label}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {isLoading && (
                         <div className="flex justify-start">
                            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-xl bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                                {loadingMessage ? (
                                    <p className="whitespace-pre-wrap">{loadingMessage}</p>
                                ) : (
                                    <div className="flex items-center space-x-2 space-x-reverse">
                                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                                        <div className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex items-center space-x-2 space-x-reverse">
                         <button
                            type="button"
                            onClick={handleListen}
                            className={`flex-shrink-0 p-2 rounded-full transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-gray-500 hover:bg-gray-200 dark:text-gray-400 dark:hover:bg-gray-600'}`}
                            title="تحدث إلى سالم"
                        >
                            <MicrophoneIcon className="h-6 w-6" />
                        </button>
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="اكتب رسالتك هنا..."
                            className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            disabled={isLoading || apiKeyStatus !== 'valid'}
                        />
                        <button type="submit" className="p-2 bg-teal-500 text-white rounded-full hover:bg-teal-600 disabled:bg-gray-400" disabled={isLoading || !input.trim() || apiKeyStatus !== 'valid'}>
                            <PaperAirplaneIcon className="h-6 w-6" />
                        </button>
                    </form>
                </div>
            </>
        );
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="no-print fixed bottom-6 left-6 z-40 bg-teal-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center hover:bg-teal-700 transition-transform transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                title="المساعد الذكي سالم"
            >
                <HeartIcon className="h-7 w-7" />
            </button>
            {isOpen && (
                <div className="no-print fixed bottom-24 left-6 z-50 w-full max-w-sm h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl flex flex-col border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-bold text-teal-800 dark:text-teal-300">المساعد الذكي سالم</h3>
                        <button onClick={() => setIsOpen(false)} className="p-1 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                    {renderChatContent()}
                </div>
            )}
        </>
    );
};

export default AiAssistant;