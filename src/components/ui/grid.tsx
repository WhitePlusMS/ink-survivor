import { cn } from '@/lib/utils';
import { HTMLAttributes, forwardRef } from 'react';

interface GridProps extends HTMLAttributes<HTMLDivElement> {
  cols?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  colsSm?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  colsMd?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  colsLg?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  colsXl?: 1 | 2 | 3 | 4 | 5 | 6 | 12;
  gap?: '0' | '1' | '2' | '3' | '4' | '6' | '8';
}

const gridCols: Record<number, string> = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5', 6: 'grid-cols-6', 12: 'grid-cols-12' };
const gridGap: Record<string, string> = { 0: 'gap-0', 1: 'gap-1', 2: 'gap-2', 3: 'gap-3', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8' };

export const Grid = forwardRef<HTMLDivElement, GridProps>(
  ({ className, cols = 1, colsSm, colsMd, colsLg, colsXl, gap = '4', children, ...props }, ref) => (
    <div ref={ref} className={cn('grid', gridCols[cols], colsSm && `sm:${gridCols[colsSm]}`, colsMd && `md:${gridCols[colsMd]}`, colsLg && `lg:${gridCols[colsLg]}`, colsXl && `xl:${gridCols[colsXl]}`, gridGap[gap], className)} {...props}>{children}</div>
  )
);
Grid.displayName = 'Grid';
