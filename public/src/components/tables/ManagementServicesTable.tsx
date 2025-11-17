"use client";
import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import UserTableShimmer from "../shimmer/UserTableShimmer";
import { getSeopagesList, deleteSeoPage, changeSeoStatus } from "@/utils/apiHandler/request";
import { getCookie } from "@/utils/helpers/cookie";
import ThreeDotDropdown from "../common/ThreedotDropdown";
import Pagination from "./Pagination";
import Input from "../form/input/InputField";
import Link from "next/link";
import Swal from "sweetalert2";

interface PageMeta {
  id: number;
  page_id: number;
  h1_tag: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  schema_markup: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  twitter_card: string | null;
  language: string | null;
  created_at: string;
  updated_at: string;
}

interface Page {
  id: number;
  title: string;
  slug: string;
  is_active: number;
  seo_status: number;
  meta: PageMeta;
  parent?: { id: number; title: string } | null;
}

export default function ManagementServicesTable() {
  const [loading, setLoading] = useState(true);
  const [seopages, setSeoPages] = useState<Page[]>([]);
  const [filteredSeoPages, setFilteredSeoPages] = useState<Page[]>([]);
  
    const [copiedSlugId, setCopiedSlugId] = useState<number | null>(null);
  // Filter states
  const [titleFilter, setTitleFilter] = useState('');
  const [slugFilter, setSlugFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [seoStatusFilter, setSeoStatusFilter] = useState('');
  const [parentFilter, setParentFilter] = useState('');
  const [parentOptions, setParentOptions] = useState<{ id: number; title: string }[]>([]);
  const [applyingFilters, setApplyingFilters] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  // Pagination state from API
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [total, setTotal] = useState(0);
  const [pageLoading, setPageLoading] = useState(false);

  const fetchSeoPages = useCallback(async (
    page = 1,
    opts: { showFilterLoader?: boolean; override?: { title?: string; slug?: string; is_active?: string; seo_status?: string; parent_id?: string } } = {}
  ) => {
    const token = getCookie("auth_token") || "";
    try {
      if (page !== 1) setPageLoading(true);
      if (opts.showFilterLoader) setApplyingFilters(true);
      const filtersPayload = {
        page_type: '2', // Management Services
        title: opts.override?.title ?? titleFilter,
        slug: opts.override?.slug ?? slugFilter,
        is_active: opts.override?.is_active ?? activeFilter,
        seo_status: opts.override?.seo_status ?? seoStatusFilter,
        parent_id: opts.override?.parent_id ?? parentFilter,
      };
      const response = await getSeopagesList(token, { page, ...filtersPayload });
      console.debug('[ManagementServicesTable] Raw API response:', response);
      const pagination = response?.data;
      if (pagination && Array.isArray(pagination.data)) {
        const rows: Page[] = pagination.data;
        setSeoPages(rows);
        setFilteredSeoPages(rows);
        const parents: { id: number; title: string }[] = [];
        rows.forEach(r => { if (r.parent?.id && !parents.find(p => p.id === r.parent!.id)) parents.push({ id: r.parent.id, title: r.parent.title }); });
        setParentOptions(prev => {
          const merged = [...prev];
            parents.forEach(p => { if (!merged.find(m => m.id === p.id)) merged.push(p); });
          return merged.sort((a, b) => a.title.localeCompare(b.title));
        });
        setCurrentPage(pagination.current_page || page);
        setLastPage(pagination.last_page || 1);
        setPerPage(pagination.per_page || rows.length || 15);
        setTotal(pagination.total || rows.length || 0);
      } else {
        console.warn('[ManagementServicesTable] Unexpected pagination structure', pagination);
        setSeoPages([]);
        setFilteredSeoPages([]);
      }
    } catch (error) {
      console.error("Error fetching seo:", error);
    } finally {
      setLoading(false);
      setPageLoading(false);
      setApplyingFilters(false);
    }
  }, [titleFilter, slugFilter, activeFilter, seoStatusFilter, parentFilter]);

  const handleDelete = async (seopage: Page) => {
    const result = await Swal.fire({
      title: 'Delete this page?',
      text: `You are about to delete "${seopage.title}". This action cannot be undone!`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#d33',
    });
    if (!result.isConfirmed) return;
    const token = getCookie('auth_token') || '';
    try {
  const resp = await deleteSeoPage(token, seopage.id, { page_type: 2 });
      if (resp) {
        // Remove locally
        setSeoPages(prev => prev.filter(p => p.id !== seopage.id));
        setFilteredSeoPages(prev => prev.filter(p => p.id !== seopage.id));
        const newTotal = Math.max(0, total - 1);
        setTotal(newTotal);
        const newLastPage = Math.max(1, Math.ceil(newTotal / perPage));
        setLastPage(newLastPage);
        // If current page now has zero rows and we have previous pages, refetch appropriate page
        setTimeout(() => {
          // Use timeout to ensure state updates applied
          if (newTotal === 0) {
            setCurrentPage(1);
          } else if (seopages.length - 1 === 0 && currentPage > 1) {
            // If we deleted the last item on this page
            const targetPage = currentPage > newLastPage ? newLastPage : currentPage - 1;
            if (targetPage !== currentPage) {
              fetchSeoPages(targetPage);
            } else {
              fetchSeoPages(currentPage); // refresh current page in case backend shifts items
            }
          } else if (currentPage > newLastPage) {
            fetchSeoPages(newLastPage);
          }
        }, 0);
        Swal.fire({
          title: 'Deleted!',
          text: 'SEO Page deleted successfully.',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
      }
    } catch (e) {
      console.error('Failed to delete page', e);
      Swal.fire({
        title: 'Error',
        text: 'Failed to delete the page.',
        icon: 'error'
      });
    }
  }
  // Initial load only (avoid double fetch on pagination because pagination triggers explicit fetch)
  // Avoid double fetch in React 18 Strict Mode (dev) with a ref guard
  const initialFetchRef = useRef(false);
  useEffect(() => {
    if (initialFetchRef.current) return;
    initialFetchRef.current = true;
    fetchSeoPages(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Local refinement (currently identical to server rows)
  useEffect(() => {
    setFilteredSeoPages(seopages);
  }, [seopages]);


  if (loading) return <UserTableShimmer />;
  return (
    <>
      <div className="mx-4 my-4 space-y-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowFilters(s => !s)}
              className="inline-flex items-center gap-2 px-4 h-11 rounded-lg border border-gray-300 bg-white text-sm font-medium hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80 dark:hover:bg-white/5"
            >
              <svg
                className="stroke-current fill-white dark:fill-gray-800"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.29004 5.90393H17.7067"
                  stroke=""
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M17.7075 14.0961H2.29085"
                  stroke=""
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M12.0826 3.33331C13.5024 3.33331 14.6534 4.48431 14.6534 5.90414C14.6534 7.32398 13.5024 8.47498 12.0826 8.47498C10.6627 8.47498 9.51172 7.32398 9.51172 5.90415C9.51172 4.48432 10.6627 3.33331 12.0826 3.33331Z"
                  fill=""
                  stroke=""
                  strokeWidth="1.5"
                />
                <path
                  d="M7.91745 11.525C6.49762 11.525 5.34662 12.676 5.34662 14.0959C5.34661 15.5157 6.49762 16.6667 7.91745 16.6667C9.33728 16.6667 10.4883 15.5157 10.4883 14.0959C10.4883 12.676 9.33728 11.525 7.91745 11.525Z"
                  fill=""
                  stroke=""
                  strokeWidth="1.5"
                />
              </svg>
              Filters
              {(titleFilter || slugFilter || parentFilter || activeFilter || seoStatusFilter) && (
                <span className="ml-1 inline-flex items-center justify-center rounded-full bg-blue-600 text-white text-[10px] px-1.5 py-0.5">
                  {[titleFilter, slugFilter, parentFilter, activeFilter, seoStatusFilter].filter(Boolean).length}
                </span>
              )}
              <span className={`transition-transform text-xs ${showFilters ? 'rotate-180' : ''}`}>▾</span>
            </button>
          </div>
          <Link
            href="/management_services/add"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition h-11 flex items-center"
          >
            + <span className="hidden sm:inline-block ml-1">Add Page</span>
          </Link>
        </div>
        {showFilters && (
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4 space-y-4 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
              <Input placeholder="Title" value={titleFilter} onChange={e => setTitleFilter(e.target.value)} />
              <Input placeholder="Slug" value={slugFilter} onChange={e => setSlugFilter(e.target.value)} />
              <select
                value={parentFilter}
                onChange={(e) => setParentFilter(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/80"
              >
                <option value="">Parent Page</option>
                {parentOptions.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/80"
              >
                <option value="">Active Status</option>
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
              <select
                value={seoStatusFilter}
                onChange={(e) => setSeoStatusFilter(e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-white/80"
              >
                <option value="">SEO Status</option>
                <option value="1">Enabled</option>
                <option value="0">Disabled</option>
              </select>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={applyingFilters}
                  onClick={() => { setCurrentPage(1); fetchSeoPages(1, { showFilterLoader: true }); }}
                  className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm disabled:opacity-50"
                >{applyingFilters ? 'Applying...' : 'Apply'}</button>
                <button
                  type="button"
                  disabled={applyingFilters}
                  onClick={() => {
                    setTitleFilter('');
                    setSlugFilter('');
                    setParentFilter('');
                    setActiveFilter('');
                    setSeoStatusFilter('');
                    setCurrentPage(1);
                    fetchSeoPages(1, { showFilterLoader: true, override: { title: '', slug: '', parent_id: '', is_active: '', seo_status: '' } });
                  }}
                  className="px-4 py-2 rounded-md bg-gray-200 text-gray-700 text-sm dark:bg-gray-700 dark:text-white/80 disabled:opacity-50"
                >{applyingFilters ? '...' : 'Reset'}</button>
              </div>
            </div>
            {/* {(titleFilter || slugFilter || activeFilter || seoStatusFilter || parentFilter) && (
              <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Active Filters:</span>
                {titleFilter && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">title="{titleFilter}"</span>}
                {slugFilter && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">slug="{slugFilter}"</span>}
                {parentFilter && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">parent_id={parentFilter}</span>}
                {activeFilter && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">is_active={activeFilter}</span>}
                {seoStatusFilter && <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 rounded">seo_status={seoStatusFilter}</span>}
              </div>
            )} */}
          </div>
        )}
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        <div className="max-w-full overflow-x-auto">
          <div className="min-w-[1000px]">
            <Table>
              {/* Table Header */}
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Title
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Slug
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Active Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    SEO Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Actions
                  </TableCell>
                </TableRow>
              </TableHeader>

              {/* Table Body */}
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {filteredSeoPages.map((seopage) => (
                  <TableRow key={seopage.id}>
                    <TableCell className="px-5 py-4 sm:px-6 text-start">
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                            {seopage.title}
                          </span>
                          {seopage.parent?.title && (
                            <span className="mt-1 inline-flex items-center rounded-full bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 px-2 py-0.5 text-[10px] font-medium">
                              Parent: {seopage.parent.title}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                                          <span className="inline-flex items-center gap-2 relative">
                                            {seopage.slug}
                                            <button
                                              type="button"
                                              aria-label="Copy slug"
                                              className="ml-1 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 relative"
                                              onClick={async (e) => {
                                                e.preventDefault();
                                                try {
                                                  await navigator.clipboard.writeText(seopage.slug);
                                                  setCopiedSlugId(seopage.id);
                                                  setTimeout(() => {
                                                    setCopiedSlugId(prev => prev === seopage.id ? null : prev);
                                                  }, 1200);
                                                } catch {}
                                              }}
                                              tabIndex={0}
                                            >
                                              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 16 16"><rect x="5" y="5" width="7" height="7" rx="1.5"/><path d="M3.5 11V3.5A1.5 1.5 0 0 1 5 2h5.5"/></svg>
                                              {copiedSlugId === seopage.id && (
                                                <span className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-gray-800 text-white text-xs shadow z-10 whitespace-nowrap" style={{pointerEvents:'none'}}>
                                                  Copied!
                                                </span>
                                              )}
                                            </button>
                                          </span>
                                        </TableCell>
                    {/* Active Status Badge */}
                    <TableCell className="px-4 py-3 text-start text-theme-sm">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize tracking-wide ${seopage.is_active ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'}`}>
                        {seopage.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    {/* SEO Status Toggle */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <button
                        onClick={async () => {
                          const token = getCookie('auth_token') || '';
                          const prevStatus = seopage.seo_status; // number (0/1)
                          const newStatusNumeric = prevStatus ? 0 : 1;
                          setSeoPages(prev => prev.map(p => p.id === seopage.id ? { ...p, seo_status: newStatusNumeric } : p));
                          setFilteredSeoPages(prev => prev.map(p => p.id === seopage.id ? { ...p, seo_status: newStatusNumeric } : p));
                          try {
                            await changeSeoStatus(token, seopage.id, newStatusNumeric);
                          } catch (error) {
                            console.error(error);
                            setSeoPages(prev => prev.map(p => p.id === seopage.id ? { ...p, seo_status: prevStatus } : p));
                            setFilteredSeoPages(prev => prev.map(p => p.id === seopage.id ? { ...p, seo_status: prevStatus } : p));
                          }
                        }}
                        className={`inline-flex items-center h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${seopage.seo_status ? 'bg-green-500' : 'bg-gray-300'}`}
                        aria-label="Toggle SEO Status"
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${seopage.seo_status ? 'translate-x-5' : 'translate-x-1'}`}
                        />
                      </button>
                    </TableCell>
                    {/* Actions */}
                    <TableCell className="px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400">
                      <ThreeDotDropdown
                        options={[
                          { label: 'Edit', onClick: () => { window.location.href = `/management_services/edit/${seopage.id}` } },
                          { label: 'Delete', onClick: () => handleDelete(seopage) }
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))}

              </TableBody>
            </Table>
            {/* Pagination */}
            <div className="px-8 pt-4 text-sm text-gray-600 dark:text-gray-400">
              {pageLoading ? 'Loading page...' : (
                total > 0 ? `Showing ${(currentPage - 1) * perPage + (seopages.length ? 1 : 0)} to ${(currentPage - 1) * perPage + seopages.length} of ${total} entries` : 'No entries'
              )}
            </div>
            <Pagination
              currentPage={currentPage}
              totalPages={lastPage}
              onPageChange={(page) => {
                if (page < 1 || page > lastPage || page === currentPage) return;
                fetchSeoPages(page);
              }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
