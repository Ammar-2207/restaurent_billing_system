export default function StatusBadge({ status, label }) {
  const isHealthy =
    status === 'healthy' ||
    status === 'connected' ||
    status === true;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
        isHealthy
          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
          : 'bg-amber-50 text-amber-700 border-amber-200'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isHealthy ? 'bg-emerald-500' : 'bg-amber-500'
        }`}
      />
      {label || (isHealthy ? 'Operational' : 'Attention')}
    </span>
  );
}
