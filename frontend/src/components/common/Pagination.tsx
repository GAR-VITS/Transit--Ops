import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="p-2 rounded-lg border border-surface-200 text-surface-700 hover:bg-surface-100 disabled:opacity-40 transition"
      >
        <ChevronLeft size={16} />
      </button>

      <span className="px-3 py-1 text-sm text-surface-700">
        Page {page} of {totalPages}
      </span>

      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="p-2 rounded-lg border border-surface-200 text-surface-700 hover:bg-surface-100 disabled:opacity-40 transition"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
