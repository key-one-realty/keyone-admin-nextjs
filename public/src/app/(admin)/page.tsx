import type { Metadata } from "next";
import { EcommerceMetrics } from "@/components/ecommerce/EcommerceMetrics";
import React from "react";
import RecentOrders, { RecentSeoPage } from "@/components/ecommerce/RecentOrders";
import { getDashboardData } from "@/utils/apiHandler/request";
import { cookies } from "next/headers";

export const metadata: Metadata = {
  title:
    "Keyone - Admin Dashboard",
  description: "",
};

export default async function Ecommerce() {
  let userCount = 0;
  let seoPageCount = 0;
  let recentSeoPages: RecentSeoPage[] = [];
  try {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth_token")?.value || "";
    const resp = await getDashboardData(token);
    if (resp?.data) {
      userCount = resp.data.user_count || 0;
      seoPageCount = resp.data.seo_page_count || 0;
      recentSeoPages = resp.data.recent_seo_pages || [];
    }
  } catch (e) {
    console.error('Dashboard fetch failed', e);
  }
  return (
    <div className="grid grid-cols-12 gap-4 md:gap-6">
      <div className="col-span-12 space-y-6">
        <EcommerceMetrics userCount={userCount} seoPageCount={seoPageCount} />

        {/* <MonthlySalesChart /> */}
      </div>

      {/* <div className="col-span-12 xl:col-span-5">
        <MonthlyTarget />
      </div> */}

      {/* <div className="col-span-12">
        <StatisticsChart />
      </div> */}

      {/* <div className="col-span-12 xl:col-span-5">
        <DemographicCard />
      </div> */}

      <div className="col-span-12">
        <RecentOrders pages={recentSeoPages} />
      </div>
    </div>
  );
}
