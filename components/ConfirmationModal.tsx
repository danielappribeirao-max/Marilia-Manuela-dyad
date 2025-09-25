import React from 'react';

interface ConfirmationModalProps {
  title: string;
  message: React.ReactNode;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false,
}) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="confirmation-modal-title">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex items-start space-x-4">
            {isDestructive && (
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            <div className="text-left">
              <h3 className="text-xl font-bold text-gray-900" id="confirmation-modal-title">{title}</h3>
              <div className="mt-2">
                <p className="text-sm text-gray-600">{message}</p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-gray-50 px-6 py-4 flex flex-col sm:flex-row-reverse gap-3 rounded-b-2xl">
          <button
            type="button"
            onClick={onConfirm}
            className={`w-full inline-flex justify-center rounded-full border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:ml-3 sm:w-auto sm:text-sm transition-colors duration-300 ${isDestructive ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-pink-500 hover:bg-pink-600 focus:ring-pink-500'} focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            {confirmText}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="mt-3 w-full inline-flex justify-center rounded-full border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:w-auto sm:text-sm transition-colors duration-300"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
