import React from 'react';
import { documentationData, DocSection } from '../data/documentationData';
import { BookOpenIcon } from '@heroicons/react/24/solid';

const Documentation: React.FC = () => {
    
    const renderSection = (section: DocSection, level: number = 0) => (
        <div key={section.id} className={`${level > 0 ? 'mr-4 border-r-2 border-teal-200 dark:border-teal-800 pr-4' : ''}`}>
            <h2 className={`font-bold text-teal-800 dark:text-teal-300 ${level === 0 ? 'text-2xl mt-8 mb-4 border-b-2 pb-2' : level === 1 ? 'text-xl mt-4 mb-2' : 'text-lg mt-2 mb-1'}`}>
                {section.title}
            </h2>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{section.content}</p>
            {section.subsections && (
                <div className="mt-2">
                    {section.subsections.map(sub => renderSection(sub, level + 1))}
                </div>
            )}
        </div>
    );

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md max-w-4xl mx-auto">
            <div className="flex items-center mb-6">
                <BookOpenIcon className="h-8 w-8 text-teal-500 ml-3" />
                <h1 className="text-3xl font-bold text-teal-800 dark:text-teal-300">وثائق النظام</h1>
            </div>
            
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                مرحباً بك في دليل استخدام نظام إدارة العيادات. هذا الدليل يوفر شرحاً لأهم وظائف النظام وكيفية استخدامها.
            </p>

            {documentationData.map(section => renderSection(section))}
        </div>
    );
};

export default Documentation;
