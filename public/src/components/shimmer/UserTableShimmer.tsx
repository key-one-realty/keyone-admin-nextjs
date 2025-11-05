import React from "react";

const shimmerRows = Array.from({ length: 5 });

export default function UserTableShimmer() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03] animate-pulse">
      <div className="max-w-full overflow-x-auto">
        <div className="min-w-[1102px]">
          <table className="w-full">
            <thead>
              <tr>
                {["User", "Project Name", "Status", "Budget"].map((header) => (
                  <th key={header} className="px-5 py-3 text-left text-gray-300 dark:text-gray-600 text-theme-xs">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shimmerRows.map((_, i) => (
                <tr key={i} className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-full" />
                      <div>
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                        {/* <div className="h-2 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div> */}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  {/* <td className="px-4 py-3">
                    <div className="flex -space-x-2">
                      {[1, 2, 3].map((n) => (
                        <div key={n} className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded-full border-2 border-white dark:border-gray-900" />
                      ))}
                    </div>
                  </td> */}
                  <td className="px-4 py-3">
                    <div className="h-3 w-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="h-3 w-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}