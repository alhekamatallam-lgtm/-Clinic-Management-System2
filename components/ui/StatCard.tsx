
import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="text-3xl font-bold text-teal-800 dark:text-teal-300">{value}</p>
      </div>
      <div className={`p-4 rounded-full ${color}`}>
        <Icon className="h-8 w-8 text-white" />
      </div>
    </div>
  );
};

export default StatCard;