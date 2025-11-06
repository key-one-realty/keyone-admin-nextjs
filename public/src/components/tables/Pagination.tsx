import { ChevronLeftIcon, ChevronUpIcon, AngleRightIcon } from "@/icons";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  // Build a stable window of up to 3 pages centered around current (current -1, current, current +1)
  const windowSize = 3;
  let start = currentPage - 1; // try to start one before current
  if (start < 1) start = 1;
  let end = start + windowSize - 1;
  if (end > totalPages) {
    end = totalPages;
    start = Math.max(1, end - windowSize + 1);
  }
  const pagesAroundCurrent = [] as number[];
  for (let p = start; p <= end; p++) pagesAroundCurrent.push(p);

  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between w-full px-8 my-8 gap-4 flex-wrap">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="First page"
          className="flex items-center h-10 justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-sm"
        >
          <ChevronLeftIcon />
          <ChevronLeftIcon />
        </button>
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="flex items-center h-10 justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-sm"
        >
          <ChevronLeftIcon className="mr-1" /> Prev
        </button>
      </div>

      <div className="flex items-center gap-2">
        {currentPage > 3 && (
          <>
            <button
              onClick={() => onPageChange(1)}
              className="flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium text-gray-500 hover:text-brand-500 hover:bg-blue-500/[0.06] dark:text-gray-400"
            >1</button>
            <span className="px-1 text-gray-400">...</span>
          </>
        )}
        {pagesAroundCurrent.map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-4 py-2 rounded ${
              currentPage === page
                ? "bg-brand-500 text-white"
                : "text-gray-700 dark:text-gray-400"
            } flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium hover:bg-blue-500/[0.08] hover:text-brand-500 dark:hover:text-brand-500`}
          >
            {page}
          </button>
        ))}
        {currentPage < totalPages - 2 && (
          <>
            <span className="px-1 text-gray-400">...</span>
            <button
              onClick={() => onPageChange(totalPages)}
              className="flex w-10 items-center justify-center h-10 rounded-lg text-sm font-medium text-gray-500 hover:text-brand-500 hover:bg-blue-500/[0.06] dark:text-gray-400"
            >{totalPages}</button>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Next page"
          className="flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-theme-xs text-sm hover:bg-gray-50 h-10 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03]"
        >
          Next <ChevronUpIcon className="ml-1 rotate-90" />
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Last page"
          className="flex items-center h-10 justify-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-700 shadow-theme-xs hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] text-sm"
        >
          <AngleRightIcon/>
          <AngleRightIcon/>
        </button>
      </div>
    </div>
  );
};

export default Pagination;
