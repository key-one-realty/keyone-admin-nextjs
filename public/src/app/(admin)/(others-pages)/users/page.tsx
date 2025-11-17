import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import UserTable from "@/components/users/userTable";
import { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "Keyone | Admin Panel",
  description: "Admin Panel",
};

export default function UsersPage() {
  return (
    <div className="grid grid-cols-1">
      <PageBreadcrumb pageTitle="Users" />
      <UserTable />
    </div>
  );
}
