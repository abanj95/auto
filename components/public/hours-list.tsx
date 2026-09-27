import type { Hours } from "@/lib/validation/site-settings";

export function HoursList({ hours, className }: { hours: Hours; className?: string }) {
  if (hours.length === 0) return <p className={className}>Call us for current hours.</p>;
  return (
    <dl className={className}>
      {hours.map((row) => (
        <div key={row.days} className="flex justify-between gap-4 py-0.5">
          <dt>{row.days}</dt>
          <dd className="text-right">{row.hours}</dd>
        </div>
      ))}
    </dl>
  );
}
