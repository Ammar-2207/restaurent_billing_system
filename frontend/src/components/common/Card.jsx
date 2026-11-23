export default function Card({ title, subtitle, action, children, className = '' }) {
  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200/90 shadow-xs hover:border-neutral-300 transition-colors ${className}`}
    >
      {(title || subtitle || action) && (
        <div className="px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            {title && (
              <h3 className="font-semibold text-sm text-neutral-900 tracking-tight">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}
