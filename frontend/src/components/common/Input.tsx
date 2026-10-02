export default function Input({ label, error, className = "", ...props }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-surface-700">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 rounded-lg border text-sm transition-all duration-200
          ${
            error
              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
              : "border-surface-200 focus:ring-primary-400 focus:border-primary-400"
          }
          focus:outline-none focus:ring-2 focus:ring-offset-0
          placeholder:text-surface-200
          ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
