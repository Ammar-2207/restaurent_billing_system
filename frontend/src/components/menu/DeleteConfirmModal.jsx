import { AlertTriangle, Loader2 } from 'lucide-react';

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  isDeleting,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl border border-neutral-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="h-12 w-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600">
          <AlertTriangle className="h-6 w-6" />
        </div>

        <div>
          <h3 className="font-semibold text-base text-neutral-900">
            Delete Menu Item
          </h3>
          <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
            Are you sure you want to delete <strong className="text-neutral-800 font-semibold">{itemName}</strong>? This action will permanently remove it from the catalog.
          </p>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-3.5 py-2 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg hover:bg-neutral-50 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition shadow-2xs disabled:opacity-50"
          >
            {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <span>Delete Item</span>
          </button>
        </div>
      </div>
    </div>
  );
}
