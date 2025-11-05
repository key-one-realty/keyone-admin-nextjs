"use client";
import React from "react";
import { GroupIcon, FileIcon } from "@/icons";

interface MetricsProps {
  userCount: number;
  seoPageCount: number;
}

export const EcommerceMetrics: React.FC<MetricsProps> = ({ userCount, seoPageCount }) => {
  const cards = [
    {
      label: 'Users',
      value: userCount,
      icon: <GroupIcon className="text-gray-800 size-6 dark:text-white/90" />,
      badge: '+0%',
      badgeColor: 'success'
    },
    {
      label: 'SEO Pages',
      value: seoPageCount,
      icon: <FileIcon className="text-gray-800 size-6 dark:text-white/90" />,
      badge: '+0%',
      badgeColor: 'success'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] md:p-6">
          <div className="flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl dark:bg-gray-800">
            {c.icon}
          </div>
          <div className="flex items-end justify-between mt-5">
            <div>
              <span className="text-sm text-gray-500 dark:text-gray-400">{c.label}</span>
              <h4 className="mt-2 font-bold text-gray-800 text-title-sm dark:text-white/90">{c.value}</h4>
            </div>
            {/* <Badge color={c.badgeColor as any}>
              <ArrowUpIcon />
              {c.badge}
            </Badge> */}
          </div>
        </div>
      ))}
    </div>
  );
};
