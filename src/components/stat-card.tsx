export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="surface-card h-full p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</div>
      <div className="mt-1.5 text-xs text-slate-500">{hint}</div>
    </div>
  );
}
