import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, caseTitle, loading }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
        <div className="delete-modal-icon-wrap">
          <AlertTriangle size={28} className="danger-icon" />
        </div>

        <div className="delete-modal-text">
          <h3>Delete Investigation?</h3>
          <p>
            Are you sure you want to permanently delete case{' '}
            <strong>"{caseTitle || 'this investigation'}"</strong>?
          </p>
          <span className="delete-warning-sub">
            All graph structures, taint trail analyses, and cached evidence for this case will be removed from SQLite.
          </span>
        </div>

        <div className="modal-footer delete-footer">
          <button
            type="button"
            className="btn-modal-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-modal-danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
