import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Role } from '../types';
import { PhotoIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const Settings: React.FC = () => {
    const { user, settings, updateSettings, showNotification } = useApp();
    const [logo, setLogo] = useState('');
    const [stamp, setStamp] = useState('');
    const [signature, setSignature] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setLogo(settings.logo || '');
        setStamp(settings.stamp || '');
        setSignature(settings.signature || '');
    }, [settings]);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await updateSettings({ logo, stamp, signature });
        } catch (error) {
            console.error("Failed to save settings:", error);
            showNotification('حدث خطأ أثناء حفظ الإعدادات', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    if (user?.role !== Role.Manager) {
        return (
            <div className="text-center p-8">
                <h1 className="text-2xl font-bold text-red-600">وصول غير مصرح به</h1>
                <p className="text-gray-600 dark:text-gray-400">هذه الصفحة متاحة للمديرين فقط.</p>
            </div>
        );
    }

    const ImageUrlInput: React.FC<{
        title: string;
        imageUrl: string;
        setImageUrl: (url: string) => void;
    }> = ({ title, imageUrl, setImageUrl }) => (
        <div className="bg-gray-50 dark:bg-gray-900/50 p-6 rounded-lg">
            <h2 className="text-xl font-semibold text-teal-800 dark:text-teal-300 mb-4">{title}</h2>
            
            <div className="w-full h-48 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center bg-white dark:bg-gray-800 mb-4 overflow-hidden">
                {imageUrl ? (
                    <img src={imageUrl} alt={title} className="max-w-full max-h-full object-contain" />
                ) : (
                    <div className="text-center text-gray-400">
                        <PhotoIcon className="h-12 w-12 mx-auto" />
                        <p>معاينة الصورة</p>
                    </div>
                )}
            </div>

            <div>
                <label className="sr-only" htmlFor={title.replace(/\s+/g, '-')}>{title}</label>
                <div className="relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <LinkIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        id={title.replace(/\s+/g, '-')}
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="أدخل رابط الصورة هنا..."
                        className="w-full p-2 pr-10 border border-gray-300 rounded-lg focus:ring-teal-500 focus:border-teal-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-400"
                    />
                </div>
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-teal-800 dark:text-teal-300 mb-6 border-b dark:border-gray-700 pb-4">إعدادات النظام</h1>
            
            <div className="space-y-8">
                <ImageUrlInput title="شعار المستوصف (Logo)" imageUrl={logo} setImageUrl={setLogo} />
                <ImageUrlInput title="ختم المستوصف (Stamp)" imageUrl={stamp} setImageUrl={setStamp} />
                <ImageUrlInput title="التوقيع العام (Signature)" imageUrl={signature} setImageUrl={setSignature} />
            </div>

            <div className="mt-8 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center justify-center bg-teal-600 text-white px-6 py-3 rounded-lg hover:bg-teal-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:bg-gray-400 min-w-[150px]"
                >
                    {isSaving ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <span>جاري الحفظ...</span>
                        </>
                    ) : (
                        <>
                            <CheckCircleIcon className="h-5 w-5 ml-2" />
                            <span>حفظ الإعدادات</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};

export default Settings;