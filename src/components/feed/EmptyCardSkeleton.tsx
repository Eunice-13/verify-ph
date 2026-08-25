/** Empty skeleton slot so grids never collapse when a category has too few verified articles. */
export default function EmptyCardSkeleton({ heightClass }: { heightClass: string }) {
  return (
    <div className={`${heightClass} rounded-xl border border-dashed border-neutral-300 bg-neutral-200/40`} />
  );
}
