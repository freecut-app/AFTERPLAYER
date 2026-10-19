import { gridClass } from './GameGrid'

export function LoadingSkeleton() {
  return (
    <div className="flex flex-col gap-10">
      <div className="skeleton h-[420px] rounded-[28px]" />
      <div className={gridClass}>
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}>
            <div className="skeleton aspect-[2/3] rounded-[18px]" />
            <div className="skeleton mt-3 h-4 w-3/4 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  )
}
