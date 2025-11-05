import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import ManagementServicesTable from "@/components/tables/ManagementServicesTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Keyone | Admin Panel",
  description: "Admin Panel",
};

export default function ManagementServicesPage() {
  return (
    <div className="grid grid-cols-1">
      <PageBreadcrumb pageTitle="Management Services" />
      <ManagementServicesTable />
    </div>
  );
}
