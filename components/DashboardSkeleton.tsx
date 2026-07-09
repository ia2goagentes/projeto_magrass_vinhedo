// Skeletons animados para o estado de carregamento do dashboard (UI-01)
// Substituem o texto "Carregando..." por placeholders visuais com animate-pulse

function SkeletonBox({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`animate-pulse rounded bg-border-hairline ${className ?? ""}`}
      style={style}
    />
  );
}

// Skeleton do HeroSummary (4 cards grandes)
export function HeroSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm sm:p-5"
        >
          <SkeletonBox className="h-9 w-9 rounded-lg" />
          <SkeletonBox className="mt-3 h-3 w-24" />
          <SkeletonBox className="mt-1.5 h-7 w-32" />
        </div>
      ))}
    </div>
  );
}

// Skeleton dos cards de métricas (5 cards CPL/CPA/CAC/ticket/ROAS)
export function CostMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="min-w-0 rounded-2xl border border-border-hairline bg-surface-card p-4 shadow-sm"
        >
          <SkeletonBox className="h-8 w-8 rounded-lg" />
          <SkeletonBox className="mt-3 h-3 w-20" />
          <SkeletonBox className="mt-1.5 h-6 w-28" />
          <SkeletonBox className="mt-3 h-7 w-full rounded" />
        </div>
      ))}
    </div>
  );
}

// Skeleton do FunnelChart
export function FunnelSkeleton() {
  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <SkeletonBox className="h-4 w-40" />
      <div className="mt-5 flex flex-col gap-6 sm:flex-row sm:items-center">
        {/* SVG placeholder */}
        <SkeletonBox className="mx-auto h-48 w-full max-w-[220px] rounded-xl sm:mx-0" />
        {/* Tabela placeholder */}
        <div className="min-w-0 flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="h-6 w-6 rounded-full" />
              <SkeletonBox className="h-3 flex-1" />
              <SkeletonBox className="h-3 w-8" />
              <SkeletonBox className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Skeleton genérico para cards menores (AdMetrics, TrendChart, etc.)
export function GenericCardSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <SkeletonBox className="h-4 w-40" />
      <div className="mt-4 space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonBox key={i} className="h-3 w-full" style={{ width: `${70 + (i % 3) * 10}%` }} />
        ))}
      </div>
    </div>
  );
}

// Skeleton do LeadFunnelCard
export function LeadFunnelSkeleton() {
  return (
    <div className="rounded-2xl border border-border-hairline bg-surface-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <SkeletonBox className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-3.5 w-32" />
          <SkeletonBox className="h-2.5 w-24" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <SkeletonBox className="h-2.5 w-2.5 rounded-full" />
            <SkeletonBox className="h-2.5 w-24" />
            <div className="min-w-0 flex-1">
              <SkeletonBox className="h-1.5 rounded-full" style={{ width: `${40 + i * 12}%` }} />
            </div>
            <SkeletonBox className="h-2.5 w-5" />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton completo do dashboard — usado enquanto loading=true
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <HeroSkeleton />
      <FunnelSkeleton />
      <CostMetricsSkeleton />
      <GenericCardSkeleton rows={3} />
      <GenericCardSkeleton rows={5} />
      <LeadFunnelSkeleton />
    </div>
  );
}
