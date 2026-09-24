import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { Modal } from './Modal';
import { useApp } from '../../context/AppContext';

export const ConfirmDialog = () => {
  const { confirmModal, closeConfirmModal } = useApp();

  if (!confirmModal.isOpen) return null;

  return (
    <Modal
      isOpen={confirmModal.isOpen}
      onClose={closeConfirmModal}
      title={confirmModal.title}
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
              confirmModal.isDestructive
                ? 'bg-rose-100 text-rose-600'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {confirmModal.isDestructive ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Are you sure?</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{confirmModal.message}</p>
            {confirmModal.details && (
              <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                {confirmModal.details}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-2">
          <button
            type="button"
            onClick={closeConfirmModal}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            {confirmModal.cancelText || 'Cancel'}
          </button>
          <button
            type="button"
            onClick={confirmModal.onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors shadow-xs ${
              confirmModal.isDestructive
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500'
                : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-500'
            }`}
          >
            {confirmModal.confirmText || 'Confirm'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
