"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { seoFormFields } from "@/utils/formConfig";
import { createSeoPage, getSeoPage, updateSeoPage, getSeoParentPages } from "@/utils/apiHandler/request";
import { getCookie } from "@/utils/helpers/cookie";
import { useParams, useRouter, usePathname } from "next/navigation";
import Input from "./input/InputField";
import TagInput from "./TagInput";
import Swal from "sweetalert2";

// Dynamic import for CKEditor React wrapper (no SSR)
const CKEditor = dynamic(
  async () => {
    const mod = await import("@ckeditor/ckeditor5-react").then(m => m.CKEditor);
    return mod;
  },
  { ssr: false }
);

// Generate TypeScript type from seoFormFields
type FormField = typeof seoFormFields[number];
// Extend with fields that may not be present in seoFormFields config (custom UI fields like parent_id)
type FormValues = {
  [K in FormField["name"]]?: string | boolean;
} & {
  parent_id?: string | boolean;
};

// API data shapes
interface SeoMetaData {
  h1_tag?: string | null;
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  schema_markup?: string | null;
  schema_markup_faq?: string | null;
  og_title?: string | null;
  og_description?: string | null;
  og_image?: string | null;
  twitter_card?: string | null;
  language?: string | null;
  page_content_1?: string | null;
  page_content_2?: string | null;
  page_content_3?: string | null;
  page_content_4?: string | null;
  page_content_5?: string | null;
}

interface SeoPageData {
  id?: number;
  title?: string | null;
  slug?: string | null;
  parent_id?: number | null;
  menu_order?: number | null;
  is_active?: number | boolean | null;
  seo_status?: number | boolean | null;
  meta?: SeoMetaData | null;
}

interface SeoPayload {
  title: string;
  slug: string;
  parent_id: number | null;
  menu_order: number | null;
  is_active: number; // backend expects number (1/0)
  seo_status: number; // backend expects number (1/0)
  page_type: number; // 1 seo page, 2 management service
  meta: Required<SeoMetaData>;
}

export default function SeoForm() {
  // Lazy-load ClassicEditor on client to avoid SSR "window is not defined"
  const [ClassicEditorBuilt, setClassicEditorBuilt] = useState<any>(null);
  const [editorLoading, setEditorLoading] = useState(true);
  
  useEffect(() => {
    let mounted = true;
    import('@ckeditor/ckeditor5-build-classic')
      .then(mod => {
        if (!mounted) return;
        // Handle both CommonJS and ES module exports and ensure proper constructor
        const EditorConstructor = mod.default || mod;
        // Verify it's a valid constructor before setting
        if (typeof EditorConstructor === 'function' || (EditorConstructor && typeof EditorConstructor.create === 'function')) {
          setClassicEditorBuilt(() => EditorConstructor);
        }
      })
      .catch(err => console.error('Failed to load CKEditor build', err))
      .finally(() => {
        if (mounted) setEditorLoading(false);
      });
    return () => { mounted = false; };
  }, []);

  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const pageType: 1 | 2 = useMemo(() => pathname?.includes('management_services') ? 2 : 1, [pathname]);
  // our catch-all route [...form] will yield an array like ["add"] or ["edit", "123"]
  const pathParts = useMemo(() => {
    if (!params?.form) return [] as string[];
    return Array.isArray(params.form) ? (params.form as string[]) : [params.form as string];
  }, [params]);

  const mode: 'add' | 'edit' = pathParts[0] === 'edit' ? 'edit' : 'add';
  const editingId = mode === 'edit' ? pathParts[1] : undefined;

  const [formValues, setFormValues] = useState<FormValues>({});
  const [loading, setLoading] = useState<boolean>(mode === 'edit');
  const [parentPages, setParentPages] = useState<{ id: number; title: string }[]>([]);
  const [parentLoading, setParentLoading] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(false);
  const [keywordTags, setKeywordTags] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  // const [generalError, setGeneralError] = useState<string | null>(null);
  const token = getCookie('auth_token') || '';
  // UI feedback for copying slug
  const [slugCopied, setSlugCopied] = useState(false);

  // Flatten API data to our form structure (including meta.* fields)
  const mapApiToFormValues = (data: SeoPageData): FormValues => {
    const values: FormValues = {};
    values.title = data?.title ?? '';
    values.slug = data?.slug ?? '';
    values.parent_id = data?.parent_id?.toString?.() ?? '';
    values.menu_order = data?.menu_order?.toString?.() ?? '';
    values.is_active = !!data?.is_active;
  values.seo_status = !!data?.seo_status;
    const meta = data?.meta || {};
  values['meta[h1_tag]'] = meta.h1_tag ?? '';
    values['meta[meta_title]'] = meta.meta_title ?? '';
    values['meta[meta_description]'] = meta.meta_description ?? '';
    values['meta[meta_keywords]'] = meta.meta_keywords ?? '';
    values['meta[canonical_url]'] = meta.canonical_url ?? '';
    values['meta[schema_markup]'] = meta.schema_markup ?? '';
    values['meta[og_title]'] = meta.og_title ?? '';
    values['meta[og_description]'] = meta.og_description ?? '';
    values['meta[og_image]'] = meta.og_image ?? '';
    values['meta[twitter_card]'] = meta.twitter_card ?? '';
    values['meta[language]'] = meta.language ?? '';
  values['meta[page_content_1]'] = meta.page_content_1 ?? '';
  values['meta[page_content_2]'] = meta.page_content_2 ?? '';
  values['meta[page_content_3]'] = meta.page_content_3 ?? '';
  values['meta[page_content_4]'] = meta.page_content_4 ?? '';
  values['meta[page_content_5]'] = meta.page_content_5 ?? '';
    return values;
  };

  // Fetch existing page when editing
  const fetchPageData = useCallback(async () => {
    if (mode === 'edit' && editingId) {
      try {
        setLoading(true);
        const resp = await getSeoPage(token, editingId);
        const pageData = resp?.data || resp?.page || resp; // flexible
        setFormValues(mapApiToFormValues(pageData));
        const mk = pageData?.meta?.meta_keywords || '';
        if (mk) {
          setKeywordTags(mk.split(',').map((t: string) => t.trim()).filter(Boolean));
        }
      } catch (err) {
        console.error('Failed to fetch SEO page', err);
      } finally {
        setLoading(false);
      }
    }
  }, [mode, editingId, token]);

  useEffect(() => {
    fetchPageData();
  }, [fetchPageData]);

  // Fetch parent page options via dedicated endpoint
  // Fetch parent pages once (prevent duplicate in Strict Mode); re-fetch only if pageType changes AND we reset the guard
  const parentsFetchedRef = useRef<{ pageType?: number }>({});
  useEffect(() => {
    if (parentsFetchedRef.current.pageType === pageType) return; // already fetched for this pageType
    parentsFetchedRef.current.pageType = pageType;
    const fetchParents = async () => {
      try {
        setParentLoading(true);
        const resp = await getSeoParentPages(token, { page_type: pageType });
        const raw = Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp?.data?.data)
            ? resp.data.data
            : [];
        if (Array.isArray(raw)) {
          setParentPages(raw.map((p) => ({ id: p.id, title: p.title })));
        }
      } catch (e) {
        console.error('Failed to load parent pages', e);
      } finally {
        setParentLoading(false);
      }
    };
    fetchParents();
  }, [pageType, token]);

  const handleChange = (name: keyof FormValues, value: string | boolean) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  // Keep formValues meta_keywords in sync with tags
  useEffect(() => {
    handleChange('meta[meta_keywords]' , keywordTags.join(','));
  }, [keywordTags]);

  // Build payload for API (unflatten meta fields)
  const buildPayload = (): SeoPayload => ({
    title: (formValues.title as string) || '',
    slug: (formValues.slug as string) || '',
    parent_id: formValues.parent_id ? Number(formValues.parent_id) : null,
    menu_order: formValues.menu_order ? Number(formValues.menu_order) : null,
    is_active: formValues.is_active ? 1 : 0,
  seo_status: formValues.seo_status ? 1 : 0,
    page_type: pageType,
    meta: {
      meta_title: (formValues['meta[meta_title]'] as string) || '',
      meta_description: (formValues['meta[meta_description]'] as string) || '',
      meta_keywords: keywordTags.join(',') || '',
      canonical_url: (formValues['meta[canonical_url]'] as string) || '',
      schema_markup: (formValues['meta[schema_markup]'] as string) || '',
      schema_markup_faq: (formValues['meta[schema_markup_faq]'] as string) || '',
      og_title: (formValues['meta[og_title]'] as string) || '',
      og_description: (formValues['meta[og_description]'] as string) || '',
      og_image: (formValues['meta[og_image]'] as string) || '',
      twitter_card: (formValues['meta[twitter_card]'] as string) || '',
      language: (formValues['meta[language]'] as string) || '',
      h1_tag: (formValues['meta[h1_tag]'] as string) || '',
      page_content_1: (formValues['meta[page_content_1]'] as string) || '',
      page_content_2: (formValues['meta[page_content_2]'] as string) || '',
      page_content_3: (formValues['meta[page_content_3]'] as string) || '',
      page_content_4: (formValues['meta[page_content_4]'] as string) || '',
      page_content_5: (formValues['meta[page_content_5]'] as string) || '',
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    // setGeneralError(null);
    try {
      const payload = buildPayload();
      let resp;
      if (mode === 'edit' && editingId) {
        resp = await updateSeoPage(token, editingId, payload);
      } else {
        resp = await createSeoPage(token, payload);
      }
      // naive success check
      if (resp) {
        await Swal.fire({
          title: 'Success',
          text: 'Form submitted successfully',
          icon: 'success',
          timer: 1800,
          showConfirmButton: false
        });
        router.push(pageType === 1 ? '/seo_pages' : '/management_services');
      }
    } catch (err: unknown) {
      console.error('Failed to submit SEO page', err);
      interface BackendError { status?: boolean; message?: string; errors?: Record<string, string[]> }
      const respData = (err as { response?: { data?: BackendError } })?.response?.data;
      if (respData?.errors) {
        const mapped: Record<string, string[]> = {};
        Object.entries(respData.errors as Record<string, string[] | undefined>).forEach(([key, messages]) => {
          if (!messages || !messages.length) return;
          // map backend key (meta.canonical_url) -> form field (meta[canonical_url])
            const formKey = key.startsWith('meta.') ? `meta[${key.substring(5)}]` : key;
          mapped[formKey] = messages;
        });
        setFieldErrors(mapped);
        // setGeneralError(respData.message || 'Validation Error');
        // scroll to first error field
        const firstKey = Object.keys(mapped)[0];
        if (firstKey) {
          requestAnimationFrame(() => {
            const el = document.getElementsByName(firstKey)[0];
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          });
        }
      } else {
        // setGeneralError('Failed to submit. Please retry.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Separate basic fields vs meta fields for clearer UI
  const basicFields = seoFormFields.filter(f => !f.name.startsWith('meta['));
  const metaFields = seoFormFields.filter(f => f.name.startsWith('meta['));

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          {mode === 'edit'
            ? pageType === 1 ? 'Edit SEO Page' : 'Edit Management Service'
            : pageType === 1 ? 'Add SEO Page' : 'Add Management Service'}
        </h2>
        <div className="flex gap-3">
          {mode === 'edit' && editingId && (
            <button
              type="button"
              onClick={() => router.push(pageType === 2
                ? `/management_services/components/edit/${editingId}`
                : `/seo_pages/components/edit/${editingId}`
              )}
              className="px-4 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-700 text-sm font-medium hover:bg-indigo-100 dark:border-indigo-500/50 dark:bg-indigo-500/10 dark:text-indigo-300"
            >Component</button>
          )}
          <button
            onClick={() => router.push(pageType === 1 ? '/seo_pages' : '/management_services')}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
          >Back to List</button>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-10">
        {loading && <p className="text-sm text-gray-500">Loading...</p>}
        {/* {generalError && (
          <div className="rounded-md border border-error-300 bg-error-50 px-4 py-3 text-error-700 text-sm dark:border-error-500/40 dark:bg-error-500/10 dark:text-error-300">
            {generalError}
          </div>
        )} */}

        {/* Basic Info */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h3 className="mb-4 text-lg font-medium">Basic Information</h3>
          <div className="grid gap-5 sm:grid-cols-2">
            {/* Parent Page Dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700 dark:text-white/70">Parent Page</label>
              <select
                name="parent_id"
                value={(formValues.parent_id as string) || ''}
                onChange={e => handleChange('parent_id', e.target.value)}
                className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
              >
                <option value="">No Parent</option>
                {parentPages
                  .filter(p => (mode === 'edit' && editingId ? p.id !== Number(editingId) : true))
                  .map(p => (
                    <option key={p.id} value={p.id}>{p.title}</option>
                  ))}
              </select>
              {parentLoading && <span className="text-xs text-gray-400">Loading pages...</span>}
            </div>
            {basicFields.map(field => (
              <div key={field.name} className="flex flex-col gap-1.5">
                {field.name === 'slug' ? (
                  <label className="text-sm font-medium text-gray-700 dark:text-white/70 flex items-center justify-between">
                    <span>{field.label}</span>
                    {mode === 'edit' && (
                      <button
                        type="button"
                        aria-label="Copy slug"
                        className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100 dark:text-white/70 dark:hover:bg-white/10"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText((formValues.slug as string) || '');
                            setSlugCopied(true);
                            setTimeout(() => setSlugCopied(false), 1200);
                          } catch {}
                        }}
                      >
                        {slugCopied ? (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 8l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="5" y="5" width="7" height="7" rx="1.5"/><path d="M3.5 11V3.5A1.5 1.5 0 0 1 5 2h5.5"/></svg>
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    )}
                  </label>
                ) : (
                  <label className="text-sm font-medium text-gray-700 dark:text-white/70">
                    {field.label}
                  </label>
                )}
        {field.type === 'text' || field.type === 'number' ? (
                  <Input
                    type={field.type === 'number' ? 'number' : 'text'}
                    name={field.name}
                    placeholder={`Enter ${field.label}`}
                    defaultValue={(formValues[field.name] as string) || ''}
          onChange={e => handleChange(field.name, e.target.value)}
          error={!!fieldErrors[field.name]}
          hint={fieldErrors[field.name]?.[0]}
                  />
                ) : field.type === 'checkbox' ? (
                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={!!formValues[field.name]}
                      onChange={e => handleChange(field.name, e.target.checked)}
                    />
                    <span className="text-sm text-gray-600 dark:text-white/60">Active</span>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* Page Content Area */}
        {/* <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h3 className="mb-4 text-lg font-medium">Page Content Area</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {[1,2,3,4,5].map((idx) => {
              const name = `meta[page_content_${idx}]` as keyof FormValues;
              return (
                <div key={String(name)} className="flex flex-col gap-1.5 md:col-span-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-white/70">Content Block {idx}</label>
                  <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                    {ClassicEditorBuilt && !editorLoading ? (
                      <CKEditor
                        editor={ClassicEditorBuilt}
                        data={(formValues[name] as string) || ''}
                        onChange={(_, editor) => handleChange(name, editor.getData())}
                      />
                    ) : (
                      <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section> */}

        {/* Meta Fields */}
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
          <h3 className="mb-4 text-lg font-medium">Meta & SEO Details</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {metaFields.filter(f => f.type !== 'editor').map(field => {
              const value = (formValues[field.name] as string) || '';
              const maxLengths: Record<string, number> = {
                'meta[meta_title]': 70,
                'meta[meta_description]': 175,
                'meta[h1_tag]': 70,
              };
              const currentMax = maxLengths[field.name] || undefined;
              return (
              <div key={field.name} className="flex flex-col gap-1.5 md:col-span-1">
                <label className="text-sm font-medium text-gray-700 dark:text-white/70 flex items-center justify-between">
                  <span>{field.label}</span>
                  {currentMax && (
                    <span className={`text-xs ${value.length > currentMax ? 'text-red-500' : 'text-gray-400'}`}>{value.length}/{currentMax}</span>
                  )}
                </label>
                {field.name === 'meta[language]' ? (
                  <select
                    name={field.name}
                    value={value || 'en'}
                    onChange={e => handleChange(field.name, e.target.value)}
                    className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                  >
                    <option value="en">English</option>
                  </select>
                ) : field.name === 'meta[meta_keywords]' ? (
                  <TagInput
                    value={keywordTags}
                    onChange={setKeywordTags}
                    placeholder={`Type keyword and press Enter`}
                    error={!!fieldErrors[field.name]}
                    errorMessage={fieldErrors[field.name]?.[0]}
                  />
                ) : field.type === 'text' ? (
                  <Input
                    type="text"
                    name={field.name}
                    placeholder={`Enter ${field.label}`}
                    value={value}
                    maxLength={currentMax}
                    onChange={e => handleChange(field.name, e.target.value)}
                    error={!!fieldErrors[field.name]}
                    hint={fieldErrors[field.name]?.[0]}
                  />
                ) : field.type === 'textarea' ? (
                  <>
                    <textarea
                      className={`h-32 w-full resize-y rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 ${fieldErrors[field.name] ? 'border-error-500 focus:border-error-500 focus:ring-error-500/10 dark:border-error-500' : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700'}`}
                      placeholder={`Enter ${field.label}`}
                      value={value}
                      maxLength={currentMax}
                      onChange={e => handleChange(field.name, e.target.value)}
                      name={field.name}
                    />
                    {fieldErrors[field.name] && <p className="mt-1 text-xs text-error-500">{fieldErrors[field.name][0]}</p>}
                  </>
                ) : null}
              </div>
            );})}
            {/* FAQ Markup textarea */}
            {/* <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-sm font-medium text-gray-700 dark:text-white/70">FAQ Markup</label>
              <textarea
                className={`h-32 w-full resize-y rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 ${fieldErrors['meta[schema_markup_faq]'] ? 'border-error-500 focus:border-error-500 focus:ring-error-500/10 dark:border-error-500' : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700'}`}
                placeholder="Enter FAQ JSON-LD markup"
                value={(formValues['meta[schema_markup_faq]'] as string) || ''}
                onChange={e => handleChange('meta[schema_markup_faq]', e.target.value)}
                name="meta[schema_markup_faq]"
              />
              {fieldErrors['meta[schema_markup_faq]'] && <p className="mt-1 text-xs text-error-500">{fieldErrors['meta[schema_markup_faq]'][0]}</p>}
            </div> */}
            {/* Full width editor */}
            {metaFields.filter(f => f.type === 'editor').map(field => (
              <div key={field.name} className="flex flex-col gap-1.5 md:col-span-2">
                <label className="text-sm font-medium text-gray-700 dark:text-white/70">{field.label}</label>
                <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                  {ClassicEditorBuilt && !editorLoading ? (
                    <CKEditor
                      editor={ClassicEditorBuilt}
                      data={(formValues[field.name] as string) || ''}
                      onChange={(_, editor) => handleChange(field.name, editor.getData())}
                    />
                  ) : (
                    <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Actions */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={() => router.push(pageType === 1 ? '/seo_pages' : '/management_services')}
            className="px-5 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
          >Cancel</button>
          <button
            type="submit"
            disabled={submitting || loading}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >{submitting ? (mode === 'edit' ? 'Updating...' : 'Saving...') : (mode === 'edit' ? 'Update' : 'Create')}</button>
        </div>
      </form>
    </div>
  );
}
