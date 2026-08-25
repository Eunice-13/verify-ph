import { X, Check } from "lucide-react";

function StatCard({
  borderClass,
  iconBgClass,
  Icon,
  count,
  label,
}: {
  borderClass: string;
  iconBgClass: string;
  Icon: typeof Check;
  count: number;
  label: string;
}) {
  return (
    <div className={`flex-1 max-w-xs mx-auto rounded-2xl border-2 ${borderClass} bg-white px-8 py-8 text-center`}>
      <span className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${iconBgClass} text-white mb-4`}>
        <Icon className="w-6 h-6" strokeWidth={3} />
      </span>
      <p className="font-serif font-bold text-3xl md:text-4xl text-neutral-900">{count}</p>
      <p className="font-serif font-bold text-lg text-neutral-900 mt-2">{label}</p>
      <p className="font-sans text-xs text-neutral-500 mt-1">Since August 2026</p>
    </div>
  );
}

/**
 * Claims Reported / Claims Verified stat cards — homepage only.
 * Placeholder counts only, until the real backend tracks submitted vs.
 * verified claim totals.
 */
export default function ClaimStats() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-10">
      <hr className="border-t-2 border-neutral-800 mb-10" />
      <div className="flex flex-col sm:flex-row gap-6 justify-center">
        <StatCard
          borderClass="border-red-700"
          iconBgClass="bg-red-600"
          Icon={X}
          count={67}
          label="Claims Reported"
        />
        <StatCard
          borderClass="border-emerald-800"
          iconBgClass="bg-emerald-600"
          Icon={Check}
          count={67}
          label="Claims Verified"
        />
      </div>
    </section>
  );
}
