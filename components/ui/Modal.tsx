import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center sm:p-4 no-print">
      <div className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:w-full sm:max-w-md sm:rounded-lg shadow-xl transform transition-all flex flex-col">
        <div className="flex-shrink-0 flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-lg font-medium text-teal-800 dark:text-teal-300">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="p-6 flex-grow overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;