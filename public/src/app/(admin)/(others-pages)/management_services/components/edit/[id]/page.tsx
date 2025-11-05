"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { updateSeoPage, updateWhyChooseComponent, updateAboutUsComponent, updateServicesComponent, updateFaqComponent, getWhyChooseComponent, getAboutUsComponent, getServicesComponent, getFaqComponent, getSeoPage } from '@/utils/apiHandler/request';
import { getCookie } from '@/utils/helpers/cookie';

const CKEditor = dynamic(async () => (await import('@ckeditor/ckeditor5-react')).CKEditor, { ssr: false });

interface MetaContent {
  page_content_1?: string | null;
  page_content_2?: string | null;
  page_content_3?: string | null;
  page_content_4?: string | null;
}
// Domain models for section content
interface WhyChoosePoint { point?: string; }
interface WhyChooseEntry { id?: number; title?: string; points?: (string | WhyChoosePoint | null | undefined)[] }
interface AboutEntry { id?: number; description?: string; map_embed?: string }
interface ServicesEntry { id?: number; title?: string; description?: string }
interface FaqApiItem { id?: number; question?: string; answer?: string }
interface FaqWrapped { id?: number; faqs: FaqApiItem[] }

// Type guards & helper shapes for safer parsing
const isRecord = (val: unknown): val is Record<string, unknown> => typeof val === 'object' && val !== null;
const hasKey = <K extends string>(obj: Record<string, unknown>, key: K): obj is Record<K, unknown> => key in obj;
const isWhyChooseEntry = (val: unknown): val is WhyChooseEntry => isRecord(val);
const isAboutEntry = (val: unknown): val is AboutEntry => isRecord(val);
const isServicesEntry = (val: unknown): val is ServicesEntry => isRecord(val);
const isFaqApiItem = (val: unknown): val is FaqApiItem => isRecord(val);
const isFaqWrapped = (val: unknown): val is FaqWrapped => isRecord(val) && Array.isArray((val as Record<string, unknown>).faqs);

export default function ManagementServiceComponentsEditPage() {
  const { id } = useParams();
  const router = useRouter();
  const token = getCookie('auth_token') || '';
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [contents, setContents] = useState<Required<MetaContent>>({
    page_content_1: '',
    page_content_2: '',
    page_content_3: '',
    page_content_4: ''
  });
  const [whyTitle, setWhyTitle] = useState<string>('');
  const [whyPoints, setWhyPoints] = useState<string[]>([]);
  // Store section ids (returned from fetch) for subsequent POST URLs
  const [sectionIds, setSectionIds] = useState<{ why?: number; about?: number; services?: number; faq?: number }>({});
  const [aboutDescription, setAboutDescription] = useState<string>('');
  const [aboutMapEmbed, setAboutMapEmbed] = useState<string>('');
  // Multiple services entries
  interface ServiceItem { title: string; description: string; }
  const [servicesItems, setServicesItems] = useState<ServiceItem[]>([]);
  // Title of the SEO page itself (from previous list page)
  const [seoPageTitle, setSeoPageTitle] = useState<string>('');
  // Per-section loading flags for skeletons
  const [sectionLoading, setSectionLoading] = useState({
    why: true,
    about: true,
    services: true,
    faq: true
  });
  // FAQs now supports multiple question/answer pairs
  interface FaqItem { question: string; answer: string; }
  const [faqs, setFaqs] = useState<FaqItem[]>([]);

  const fetchPage = useCallback(async () => {
    try {
      setLoading(true);
      // Component IDs (distinct) – adjust if backend changes mapping
      const whyId = id;
      const aboutId = id;
      const servicesId = id;
      const faqId = id;

      // Generic safe extract: handles shapes like {data:{...}} | {data:[...]} | {content:{...}} | JSON string | direct object
      const unwrap = (raw: unknown): unknown => {
        if (raw == null) return null;
        let candidate: unknown = raw;
        if (isRecord(candidate)) {
          if (hasKey(candidate, 'data') && candidate.data) candidate = candidate.data as unknown;
          if (isRecord(candidate) && hasKey(candidate, 'content') && candidate.content) candidate = candidate.content as unknown;
        }
        if (typeof candidate === 'string') {
          try { return JSON.parse(candidate); } catch { return candidate; }
        }
        return candidate;
      };

      const [seoPageResp, whyResp, aboutResp, servicesResp, faqResp] = await Promise.all([
        getSeoPage(token, id),
        getWhyChooseComponent(token, whyId).finally(() => setSectionLoading(prev => ({ ...prev, why: false }))),
        getAboutUsComponent(token, aboutId).finally(() => setSectionLoading(prev => ({ ...prev, about: false }))),
        getServicesComponent(token, servicesId).finally(() => setSectionLoading(prev => ({ ...prev, services: false }))),
        getFaqComponent(token, faqId).finally(() => setSectionLoading(prev => ({ ...prev, faq: false })))
      ]);
      console.log({ seoPageResp, whyResp, aboutResp, servicesResp, faqResp });

      // Extract management service page title (new shape nests under data.title)
      if (isRecord(seoPageResp)) {
        const dataObj = (seoPageResp as Record<string, unknown>).data;
        if (isRecord(dataObj) && typeof dataObj.title === 'string') {
          setSeoPageTitle(dataObj.title);
        } else if (typeof (seoPageResp as Record<string, unknown>).title === 'string') {
          // Fallback to legacy flat shape
            setSeoPageTitle(String((seoPageResp as Record<string, unknown>).title));
        }
      }

      // WHY CHOOSE (supports new shape: { status, message, data: [ { title, points: [{point: string}] } ] })
      const whyDataRaw = unwrap(whyResp);
      if (whyDataRaw) {
        let whyEntry: unknown = whyDataRaw;
        if (isRecord(whyDataRaw) && hasKey(whyDataRaw, 'data') && Array.isArray(whyDataRaw.data)) {
          whyEntry = whyDataRaw.data[0];
        } else if (Array.isArray(whyDataRaw)) {
          whyEntry = whyDataRaw[0];
        }
        if (isWhyChooseEntry(whyEntry)) {
          if (whyEntry?.id && typeof whyEntry.id === 'number') setSectionIds(prev => ({ ...prev, why: whyEntry.id! }));
          const title = typeof whyEntry.title === 'string' ? whyEntry.title : '';
          const rawPoints = Array.isArray(whyEntry.points) ? whyEntry.points : [];
          const points: string[] = rawPoints
            .map((p: unknown) => {
              if (typeof p === 'string') return p;
              if (isRecord(p) && typeof p.point === 'string') return p.point;
              return null;
            })
            .filter((v): v is string => Boolean(v));
          setWhyTitle(title);
          setWhyPoints(points);
          setContents(prev => ({ ...prev, page_content_1: JSON.stringify({ title, points }) }));
        } else if (typeof whyDataRaw === 'string') {
          setWhyTitle(whyDataRaw);
          setWhyPoints([]);
          setContents(prev => ({ ...prev, page_content_1: whyDataRaw }));
        }
      }

      // ABOUT US
      const aboutData = unwrap(aboutResp);
      if (aboutData) {
        if (typeof aboutData === 'string') {
          setAboutDescription(aboutData);
          setAboutMapEmbed('');
          setContents(prev => ({ ...prev, page_content_2: aboutData }));
        } else if (isAboutEntry(aboutData)) {
          if (aboutData?.id && typeof aboutData.id === 'number') setSectionIds(prev => ({ ...prev, about: aboutData.id }));
          const description = typeof aboutData.description === 'string' ? aboutData.description : '';
          const map_embed = typeof aboutData.map_embed === 'string' ? aboutData.map_embed : '';
          setAboutDescription(description);
          setAboutMapEmbed(map_embed);
          setContents(prev => ({ ...prev, page_content_2: JSON.stringify({ description, map_embed }) }));
        }
      }

      // SERVICES (new shape may wrap in {status,message,data:[...]}; unwrap converts to array if data present)
      const servicesData = unwrap(servicesResp);
      if (servicesData) {
        if (typeof servicesData === 'string') {
          // Try parse stringified array
            try {
              const parsed = JSON.parse(servicesData);
              if (Array.isArray(parsed)) {
                const arr: ServiceItem[] = parsed.filter(it => isRecord(it)).map(it => ({
                  title: typeof it.title === 'string' ? it.title : '',
                  description: typeof it.description === 'string' ? it.description : ''
                }));
                setServicesItems(arr);
                setContents(prev => ({ ...prev, page_content_3: JSON.stringify(arr) }));
              } else {
                setServicesItems([{ title: '', description: servicesData }]);
                setContents(prev => ({ ...prev, page_content_3: JSON.stringify([{ title: '', description: servicesData }]) }));
              }
            } catch {
              setServicesItems([{ title: '', description: servicesData }]);
              setContents(prev => ({ ...prev, page_content_3: JSON.stringify([{ title: '', description: servicesData }]) }));
            }
        } else if (Array.isArray(servicesData)) {
          const arr: ServiceItem[] = servicesData.filter(it => isRecord(it)).map(it => ({
            title: typeof it.title === 'string' ? it.title : '',
            description: typeof it.description === 'string' ? it.description : ''
          }));
          // Capture first id if present
          const firstWithId = servicesData.find(it => isRecord(it) && typeof (it as Record<string, unknown>).id === 'number') as (Record<string, unknown> | undefined);
          if (firstWithId) {
            const idVal = (firstWithId as Record<string, unknown>).id;
            if (typeof idVal === 'number') setSectionIds(prev => ({ ...prev, services: idVal }));
          }
          setServicesItems(arr);
          setContents(prev => ({ ...prev, page_content_3: JSON.stringify(arr) }));
        } else if (isServicesEntry(servicesData)) {
          if (servicesData?.id && typeof servicesData.id === 'number') setSectionIds(prev => ({ ...prev, services: servicesData.id }));
          const single = {
            title: typeof servicesData.title === 'string' ? servicesData.title : '',
            description: typeof servicesData.description === 'string' ? servicesData.description : ''
          };
          setServicesItems([single]);
          setContents(prev => ({ ...prev, page_content_3: JSON.stringify([single]) }));
        }
      } else {
        setServicesItems([]);
        setContents(prev => ({ ...prev, page_content_3: '[]' }));
      }

      // FAQ (array or legacy single) - also support wrapped shape { faqs: [...] }
      const faqData = unwrap(faqResp);
      if (faqData) {
        if (Array.isArray(faqData)) {
          const cleaned = faqData
            .filter(it => isRecord(it))
            .map(it => ({ question: typeof it.question === 'string' ? it.question : '', answer: typeof it.answer === 'string' ? it.answer : '' }));
          setFaqs(cleaned);
          setContents(prev => ({ ...prev, page_content_4: JSON.stringify(cleaned) }));
        } else if (isFaqWrapped(faqData)) {
          if (faqData?.id && typeof faqData.id === 'number') setSectionIds(prev => ({ ...prev, faq: faqData.id }));
          const arr = faqData.faqs
            .filter((it): it is FaqApiItem => isFaqApiItem(it))
            .map(it => ({ question: typeof it.question === 'string' ? it.question : '', answer: typeof it.answer === 'string' ? it.answer : '' }));
          setFaqs(arr);
          setContents(prev => ({ ...prev, page_content_4: JSON.stringify(arr) }));
        } else if (typeof faqData === 'string') {
          setFaqs([{ question: '', answer: faqData }]);
          setContents(prev => ({ ...prev, page_content_4: JSON.stringify([{ question: '', answer: faqData }]) }));
        } else if (isFaqApiItem(faqData)) {
          if (faqData?.id && typeof faqData.id === 'number') setSectionIds(prev => ({ ...prev, faq: faqData.id }));
          const q = typeof faqData.question === 'string' ? faqData.question : '';
          const a = typeof faqData.answer === 'string' ? faqData.answer : '';
          const arr = (q || a) ? [{ question: q, answer: a }] : [];
          setFaqs(arr);
          setContents(prev => ({ ...prev, page_content_4: JSON.stringify(arr) }));
        }
      } else {
        setFaqs([]);
        setContents(prev => ({ ...prev, page_content_4: '[]' }));
      }
    } catch (e) {
      console.error('Failed to load management service components', e);
    } finally {
      setLoading(false);
    }
  }, [token, id]);
  // Guard to avoid double-fetch in React 18 Strict Mode (dev) which intentionally mounts twice
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (hasFetchedRef.current) return; // skip second strict-mode invoke
    if (!id) return; // wait until id is available
    hasFetchedRef.current = true;
    fetchPage();
  }, [fetchPage, id]);

  const handleUpdate = async (key: keyof MetaContent) => {
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      if (key === 'page_content_1') {
        const structured = {
          title: whyTitle,
          points: whyPoints.filter(p => p.trim() !== ''),
          page_type: 2
        };
        await updateWhyChooseComponent(token, id as string, sectionIds.why, structured);
        // store JSON string locally for consistency
        setContents(prev => ({ ...prev, page_content_1: JSON.stringify(structured) }));
      } else if (key === 'page_content_2') {
        const structuredAbout = {
          description: aboutDescription,
          map_embed: aboutMapEmbed,
          page_type: 2
        };
        await updateAboutUsComponent(token, id as string, sectionIds.about, structuredAbout);
        setContents(prev => ({ ...prev, page_content_2: JSON.stringify(structuredAbout) }));
      } else if (key === 'page_content_3') {
        // Clean services: remove entries with both fields empty
        const cleanedServices = servicesItems.filter(s => s.title.trim() !== '' || s.description.trim() !== '');
        const payload = { services: cleanedServices, page_type: 2 };
        await updateServicesComponent(token, id as string, sectionIds.services, payload);
        setContents(prev => ({ ...prev, page_content_3: JSON.stringify(cleanedServices) }));
      } else if (key === 'page_content_4') {
        // Clean FAQs: remove empty rows
        const cleanedFaqs = faqs.filter(f => f.question.trim() !== '' || f.answer.trim() !== '');
        const payload = { faqs: cleanedFaqs, page_type: 2 };
        await updateFaqComponent(token, id as string, sectionIds.faq, payload);
        setContents(prev => ({ ...prev, page_content_4: JSON.stringify(cleanedFaqs) }));
      } else {
        const value: string | null = contents[key] || '';
        const payload = { meta: { [key]: value }, page_type: 2 };
        await updateSeoPage(token, id as string, payload);
      }
      await Swal.fire({
        title: 'Saved',
        text: 'Section updated successfully',
        icon: 'success',
        timer: 1200,
        showConfirmButton: false
      });
    } catch (e) {
      console.error('Failed to save section', e);
      await Swal.fire({ title: 'Error', text: 'Failed to save section', icon: 'error' });
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  };

  const sectionDefs: { key: keyof MetaContent; title: string; description: string }[] = [
    { key: 'page_content_1', title: 'Manage Why Choose Us', description: 'Content displayed in the Why Choose Us section.' },
    { key: 'page_content_2', title: 'Manage About Us', description: 'Content for the About Us section.' },
    { key: 'page_content_3', title: 'Manage Our Services', description: 'Details of services offered.' },
    { key: 'page_content_4', title: 'Manage FAQ', description: 'Frequently Asked Questions content.' }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          {seoPageTitle.trim() || ''}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/management_services/edit/${id}`)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
          >Back</button>
        </div>
      </div>
  {/* Global spinner removed; skeletons show inline */}
      <div className="space-y-10">
        {sectionDefs.map(section => {
          if (section.key === 'page_content_1') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">{section.title}</h3>
                  <button
                    onClick={() => handleUpdate(section.key)}
                    disabled={!!saving[section.key] || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                </div>
                {sectionLoading.why ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-48 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="space-y-2">
                      <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-5/6 rounded bg-gray-200 dark:bg-gray-700" />
                      <div className="h-3 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                    </div>
                  </div>
                ) : (
                <>
                  <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Enter a title and bullet points for the Why Choose Us section.</p>
                  <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      type="text"
                      value={whyTitle}
                      onChange={e => setWhyTitle(e.target.value)}
                      placeholder="Why Choose Key One"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Points</label>
                      <button
                        type="button"
                        onClick={() => setWhyPoints(prev => [...prev, ''])}
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
                      >Add Point</button>
                    </div>
                    <div className="space-y-3">
                      {whyPoints.map((pt, idx) => (
                        <div key={idx} className="flex gap-2">
                          <input
                            type="text"
                            value={pt}
                            onChange={e => setWhyPoints(prev => prev.map((p,i) => i===idx ? e.target.value : p))}
                            placeholder={`Point ${idx+1}`}
                            className="h-10 flex-1 rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                          <button
                            type="button"
                            onClick={() => setWhyPoints(prev => prev.filter((_,i) => i!==idx))}
                            className="h-10 rounded-lg border border-red-300 bg-red-50 px-3 text-xs font-medium text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                          >Remove</button>
                        </div>
                      ))}
                      {whyPoints.length === 0 && (
                        <p className="text-xs text-gray-400">No points added yet.</p>
                      )}
                    </div>
                  </div>
                </div>
                </>) }
              </section>
            );
          } else if (section.key === 'page_content_2') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Manage About Us</h3>
                  <button
                    onClick={() => handleUpdate(section.key)}
                    disabled={!!saving[section.key] || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                </div>
                {sectionLoading.about ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-56 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-32 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-20 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : (
                <>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Edit the description and Google Maps embed iframe for the About Us section.</p>
                <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      {ClassicEditorBuilt && !editorLoading ? (
                        <CKEditor
                          editor={ClassicEditorBuilt}
                          data={aboutDescription}
                          onChange={(_, editor) => setAboutDescription(editor.getData())}
                        />
                      ) : (
                        <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Google Map Embed Iframe</label>
                    <textarea
                      value={aboutMapEmbed}
                      onChange={e => setAboutMapEmbed(e.target.value)}
                      placeholder="<iframe src=... ></iframe>"
                      rows={5}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-mono shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                    <p className="mt-1 text-[10px] text-gray-400">Paste the full iframe code from Google Maps embed.</p>
                  </div>
                </div>
                </>) }
              </section>
            );
          } else if (section.key === 'page_content_3') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Manage Our Services</h3>
                  <button
                    onClick={() => handleUpdate(section.key)}
                    disabled={!!saving[section.key] || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                </div>
                {sectionLoading.services ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-32 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : (
                <>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Manage multiple service entries. Each has a title and rich description.</p>
                <div className="mb-4">
                  <button
                    type="button"
                    onClick={() => setServicesItems(prev => [...prev, { title: '', description: '' }])}
                    className="rounded-md border border-gray-300 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
                  >Add Service</button>
                </div>
                <div className="space-y-6">
                  {servicesItems.length === 0 && (
                    <p className="text-xs text-gray-400">No services added yet. Click Add Service.</p>
                  )}
                  {servicesItems.map((svc, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white/50 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Service #{idx + 1}</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setServicesItems(prev => prev.filter((_, i) => i !== idx))}
                            className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                          >Remove</button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => setServicesItems(prev => {
                                const arr = [...prev];
                                const tmp = arr[idx - 1];
                                arr[idx - 1] = arr[idx];
                                arr[idx] = tmp;
                                return arr;
                              })}
                              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/70"
                            >Move Up</button>
                          )}
                          {idx < servicesItems.length - 1 && (
                            <button
                              type="button"
                              onClick={() => setServicesItems(prev => {
                                const arr = [...prev];
                                const tmp = arr[idx + 1];
                                arr[idx + 1] = arr[idx];
                                arr[idx] = tmp;
                                return arr;
                              })}
                              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/70"
                            >Move Down</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Title</label>
                          <input
                            type="text"
                            value={svc.title}
                            onChange={e => setServicesItems(prev => prev.map((s,i) => i===idx ? { ...s, title: e.target.value } : s))}
                            placeholder="Service title"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                          <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                            {ClassicEditorBuilt && !editorLoading ? (
                              <CKEditor
                                editor={ClassicEditorBuilt}
                                data={svc.description}
                                onChange={(_, editor) => setServicesItems(prev => prev.map((s,i) => i===idx ? { ...s, description: editor.getData() } : s))}
                              />
                            ) : (
                              <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>) }
              </section>
            );
          } else if (section.key === 'page_content_4') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Manage FAQ</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFaqs(prev => [...prev, { question: '', answer: '' }])}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
                    >Add FAQ</button>
                    <button
                      onClick={() => handleUpdate(section.key)}
                      disabled={!!saving[section.key] || loading}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                    >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                  </div>
                </div>
                {sectionLoading.faq ? (
                  <div className="animate-pulse space-y-4">
                    <div className="h-4 w-52 rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
                    <div className="h-10 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  </div>
                ) : (
                <>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Manage multiple FAQ items. Each item has a question and rich-text answer.</p>
                <div className="space-y-6">
                  {faqs.length === 0 && (
                    <p className="text-xs text-gray-400">No FAQ items yet. Click Add FAQ to create one.</p>
                  )}
                  {faqs.map((faq, idx) => (
                    <div key={idx} className="rounded-lg border border-gray-200 bg-white/50 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                      <div className="mb-3 flex items-start justify-between gap-4">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">FAQ #{idx + 1}</h4>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setFaqs(prev => prev.filter((_, i) => i !== idx))}
                            className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1 text-[11px] font-medium text-red-600 hover:bg-red-100 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                          >Remove</button>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => setFaqs(prev => {
                                const arr = [...prev];
                                const tmp = arr[idx - 1];
                                arr[idx - 1] = arr[idx];
                                arr[idx] = tmp;
                                return arr;
                              })}
                              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/70"
                            >Move Up</button>
                          )}
                          {idx < faqs.length - 1 && (
                            <button
                              type="button"
                              onClick={() => setFaqs(prev => {
                                const arr = [...prev];
                                const tmp = arr[idx + 1];
                                arr[idx + 1] = arr[idx];
                                arr[idx] = tmp;
                                return arr;
                              })}
                              className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/70"
                            >Move Down</button>
                          )}
                        </div>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Question</label>
                          <input
                            type="text"
                            value={faq.question}
                            onChange={e => setFaqs(prev => prev.map((f,i) => i===idx ? { ...f, question: e.target.value } : f))}
                            placeholder="What is property management?"
                            className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">Answer</label>
                          <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                            {ClassicEditorBuilt && !editorLoading ? (
                              <CKEditor
                                editor={ClassicEditorBuilt}
                                data={faq.answer}
                                onChange={(_, editor) => setFaqs(prev => prev.map((f,i) => i===idx ? { ...f, answer: editor.getData() } : f))}
                              />
                            ) : (
                              <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </>) }
              </section>
            );
          }
          return (
            <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-medium">{section.title}</h3>
                <button
                  onClick={() => handleUpdate(section.key)}
                  disabled={!!saving[section.key] || loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
              </div>
              <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">{section.description}</p>
              <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                {ClassicEditorBuilt && !editorLoading ? (
                  <CKEditor
                    editor={ClassicEditorBuilt}
                    data={contents[section.key] || ''}
                    onChange={(_, editor) => setContents(prev => ({ ...prev, [section.key]: editor.getData() }))}
                  />
                ) : (
                  <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
