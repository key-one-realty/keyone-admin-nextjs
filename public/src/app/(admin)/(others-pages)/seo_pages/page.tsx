import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import SeoTable from "@/components/tables/seoTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Keyone | Admin Panel",
  description: "Admin Panel",
};

export default function SeoPage() {
  return (
    <div className="grid grid-cols-1">
      <PageBreadcrumb pageTitle="Seo Pages" />
      <SeoTable />
    </div>
  );
}
