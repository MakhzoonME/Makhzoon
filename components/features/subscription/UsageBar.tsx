interface UsageBarProps {
  label: string;
  current: number;
  max: number; // -1 = unlimited
}

export function UsageBar({ label, current, max }: UsageBarProps) {
  if (max === -1) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-gray-700">{label}</span>
          <span className="text-gray-500">{current} / Unlimited</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100">
          <div className="h-full w-0 rounded-full bg-primary-500" />
        </div>
      </div>
    );
  }

  const pct = max === 0 ? 0 : Math.min((current / max) * 100, 100);
  const color = pct < 70 ? 'bg-green-500' : pct < 90 ? 'bg-amber-500' : 'bg-red-500';
  const trackColor = pct < 70 ? 'bg-green-100' : pct < 90 ? 'bg-amber-100' : 'bg-red-100';

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">
          {current} / {max} ({Math.round(pct)}%)
        </span>
      </div>
      <div className={`h-2 w-full rounded-full ${trackColor}`}>
        <div className={`h-full rounded-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
