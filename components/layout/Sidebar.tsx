import React, { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Role, View } from '../../types';
import { ChartBarIcon, UserGroupIcon, ClipboardDocumentListIcon, UsersIcon, BuildingOffice2Icon, DocumentChartBarIcon, PresentationChartLineIcon, BeakerIcon, QueueListIcon, CurrencyDollarIcon, HeartIcon, ChevronDownIcon, Cog6ToothIcon, BookOpenIcon, LightBulbIcon } from '@heroicons/react/24/outline';

const Sidebar: React.FC = () => {
    const { user, currentView, setView, isSidebarOpen } = useApp();
    const [isReportsOpen, setIsReportsOpen] = useState(false);

    useEffect(() => {
        const reportViews: View[] = ['reports', 'daily-clinic-report', 'medical-report'];
        if (reportViews.includes(currentView)) {
            setIsReportsOpen(true);
        }
    }, [currentView]);

    if (!user) return null;

    const navItems = [
        { view: 'dashboard', label: 'لوحة التحكم', icon: PresentationChartLineIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'queue', label: 'شاشة الانتظار', icon: QueueListIcon, roles: [Role.Reception, Role.Doctor, Role.Manager], color: 'text-amber-400' },
        { view: 'patients', label: 'المرضى', icon: UserGroupIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'visits', label: 'الزيارات', icon: ClipboardDocumentListIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'revenues', label: 'الإيرادات', icon: CurrencyDollarIcon, roles: [Role.Reception, Role.Manager] },
        { view: 'diagnosis', label: 'التشخيص', icon: BeakerIcon, roles: [Role.Doctor, Role.Manager] },
        {
            id: 'reports-group',
            label: 'التقارير',
            icon: DocumentChartBarIcon,
            roles: [Role.Reception, Role.Doctor, Role.Manager],
            subItems: [
                { view: 'reports', label: 'تقارير الإيرادات', roles: [Role.Reception, Role.Doctor, Role.Manager] },
                { view: 'daily-clinic-report', label: 'التقرير اليومي للعيادات', roles: [Role.Reception, Role.Doctor, Role.Manager] },
                { view: 'medical-report', label: 'التقارير الطبية', roles: [Role.Reception, Role.Doctor, Role.Manager] },
            ]
        },
        { view: 'users', label: 'المستخدمين', icon: UsersIcon, roles: [Role.Manager] },
        { view: 'clinics', label: 'العيادات', icon: BuildingOffice2Icon, roles: [Role.Manager] },
        { view: 'doctors', label: 'الأطباء', icon: HeartIcon, roles: [Role.Manager] },
        { view: 'documentation', label: 'الوثائق', icon: BookOpenIcon, roles: [Role.Reception, Role.Doctor, Role.Manager] },
        { view: 'optimization', label: 'تحسينات واقتراحات', icon: LightBulbIcon, roles: [Role.Reception, Role.Doctor, Role.Manager], color: 'text-orange-400' },
        { view: 'settings', label: 'الإعدادات', icon: Cog6ToothIcon, roles: [Role.Manager] },
    ];

    const filteredNavItems = navItems.filter(item => item.roles.includes(user.role));

    const mobileTransform = isSidebarOpen ? 'translate-x-0' : 'translate-x-full';
    const desktopWidth = isSidebarOpen ? 'lg:w-64' : 'lg:w-20';

    return (
        <div className={`fixed lg:static inset-y-0 right-0 z-30 bg-teal-800 text-white flex flex-col p-4 space-y-4 w-64 transform lg:transform-none transition-all duration-300 ease-in-out ${mobileTransform} ${desktopWidth}`}>
            <div className="flex items-center justify-center py-4 border-b border-teal-700 overflow-hidden">
                <ChartBarIcon className="h-8 w-8 text-teal-300 flex-shrink-0"/>
                {isSidebarOpen && <h1 className="text-xl font-bold ml-2 text-center whitespace-nowrap">مستوصف الراجحي</h1>}
            </div>
            <nav className="flex-1 overflow-y-auto pb-4 min-h-0">
                <ul className="space-y-2">
                    {filteredNavItems.map(item => {
                        // Group with sub-items (Reports)
                        if ('subItems' in item && item.subItems) {
                            const isGroupActive = item.subItems.some(sub => sub.view === currentView);
                            return (
                                <li key={item.id}>
                                    <button
                                        onClick={() => isSidebarOpen && setIsReportsOpen(!isReportsOpen)}
                                        className={`w-full flex items-center px-4 py-3 text-gray-100 hover:bg-teal-700 rounded-lg transition-colors duration-200 ${isGroupActive ? 'bg-teal-700 font-bold' : ''} ${!isSidebarOpen ? 'justify-center' : ''}`}
                                        title={!isSidebarOpen ? item.label : ''}
                                    >
                                        <item.icon className={`h-6 w-6 flex-shrink-0 ${isSidebarOpen ? 'ml-3' : ''}`} />
                                        {isSidebarOpen && <span className="flex-1 text-right">{item.label}</span>}
                                        {isSidebarOpen && <ChevronDownIcon className={`h-5 w-5 transition-transform duration-200 ${isReportsOpen ? 'rotate-180' : ''}`} />}
                                    </button>
                                    {isSidebarOpen && (
                                        <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isReportsOpen ? 'max-h-40' : 'max-h-0'}`}>
                                            <ul className="pt-2 pr-6 space-y-2">
                                                {item.subItems
                                                    .filter(subItem => subItem.roles.includes(user.role))
                                                    .map(subItem => {
                                                        const isActive = currentView === subItem.view;
                                                        return (
                                                            <li key={subItem.view}>
                                                                <a
                                                                    href="#"
                                                                    onClick={(e) => { e.preventDefault(); setView(subItem.view as View); }}
                                                                    className={`flex items-center px-4 py-2 text-sm text-gray-200 hover:bg-teal-600 rounded-lg transition-colors duration-200 ${isActive ? 'bg-teal-600 font-semibold' : ''}`}
                                                                >
                                                                    <span>{subItem.label}</span>
                                                                </a>
                                                            </li>
                                                        );
                                                    })
                                                }
                                            </ul>
                                        </div>
                                    )}
                                </li>
                            );
                        }

                        // Single nav item
                        const { view, label, icon: Icon, color } = item as { view: View, label: string, icon: React.ElementType, color?: string };
                        const isActive = currentView === view;
                        const colorClass = color || '';
                        return (
                            <li key={view}>
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setView(view); }}
                                    className={`flex items-center px-4 py-3 text-gray-100 hover:bg-teal-700 rounded-lg transition-colors duration-200 ${isActive ? 'bg-teal-700 font-bold' : ''} ${!isSidebarOpen ? 'justify-center' : ''}`}
                                    title={!isSidebarOpen ? label : ''}
                                >
                                    <Icon className={`h-6 w-6 flex-shrink-0 ${isSidebarOpen ? 'ml-3' : ''} ${colorClass}`} />
                                    {isSidebarOpen && <span>{label}</span>}
                                </a>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;