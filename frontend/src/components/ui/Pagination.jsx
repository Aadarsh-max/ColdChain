import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button.jsx';

export default function Pagination({ meta, onPage }) {
  if (!meta) return null;

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
      <span>
        {meta.total} result{meta.total === 1 ? '' : 's'} · Page {meta.page} of {meta.pages}
      </span>
      {meta.pages > 1 && (
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>
            <ChevronLeft className="h-4 w-4" /> Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={meta.page >= meta.pages}
            onClick={() => onPage(meta.page + 1)}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}