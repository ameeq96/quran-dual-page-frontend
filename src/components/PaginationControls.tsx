import type { PaginationMeta } from '../api';
import { Button } from './ui';

type PaginationControlsProps = {
  meta: PaginationMeta | null;
  onPageChange: (page: number) => void;
};

export default function PaginationControls({
  meta,
  onPageChange,
}: PaginationControlsProps) {
  if (!meta || meta.totalItems === 0) {
    return null;
  }

  const canGoBack = meta.page > 1;
  const canGoNext = meta.page < meta.totalPages;
  const fromItem = (meta.page - 1) * meta.pageSize + 1;
  const toItem = Math.min(meta.page * meta.pageSize, meta.totalItems);

  return (
    <div className="mt-[22px] flex flex-col gap-3 border-t border-[rgba(15,42,39,0.1)] pt-[18px] md:flex-row md:items-center md:justify-between">
      <span className="text-sm text-[#59716a]">
        Showing {fromItem}-{toItem} of {meta.totalItems}
      </span>
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          variant="ghost"
          disabled={!canGoBack}
          onClick={() => onPageChange(meta.page - 1)}
          type="button"
        >
          Previous
        </Button>
        <span className="text-sm font-bold text-[#10201c]">
          Page {meta.page} / {meta.totalPages}
        </span>
        <Button
          variant="ghost"
          disabled={!canGoNext}
          onClick={() => onPageChange(meta.page + 1)}
          type="button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
