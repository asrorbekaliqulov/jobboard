import React from 'react';

/** Skeleton card placeholder shown while data is loading */
export const SkeletonCard: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <div
    className={`rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 card-shadow p-5 space-y-3 card-enter card-enter-${Math.min(index + 1, 5)}`}
    style={{ borderLeft: '3px solid #e2e8f0' }}
  >
    {/* Title line */}
    <div className="skeleton h-5 w-3/5 dark:opacity-20" />
    {/* Subtitle line */}
    <div className="flex gap-2">
      <div className="skeleton h-3 w-24 dark:opacity-20" />
      <div className="skeleton h-3 w-20 dark:opacity-20" />
    </div>
    {/* Salary */}
    <div className="skeleton h-5 w-2/5 dark:opacity-20" />
    {/* Chips */}
    <div className="flex gap-2">
      <div className="skeleton h-6 w-16 dark:opacity-20" />
      <div className="skeleton h-6 w-20 dark:opacity-20" />
      <div className="skeleton h-6 w-14 dark:opacity-20" />
    </div>
    {/* Date */}
    <div className="skeleton h-3 w-28 dark:opacity-20" />
  </div>
);

/** Multiple skeleton cards for loading state */
export const SkeletonList: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} index={i} />
    ))}
  </div>
);
