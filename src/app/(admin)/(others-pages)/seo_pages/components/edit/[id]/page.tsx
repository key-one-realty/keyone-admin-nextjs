"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { updateSeoPage, updateWhyChooseComponent, updateAboutUsComponent, updateServicesComponent, updateFaqComponent, getWhyChooseComponent, getAboutUsComponent, getServicesComponent, getFaqComponent, getSeoPage, getHeroSection, updateHeroSection, getServicesBgSection, updateServicesBgSection, getTransparentPricing, updateTransparentPricing } from '@/utils/apiHandler/request';
import { getCookie } from '@/utils/helpers/cookie';

const CKEditor = dynamic(async () => (await import('@ckeditor/ckeditor5-react')).CKEditor, { ssr: false });

interface MetaContent {
  page_content_1?: string | null;
  page_content_2?: string | null;
  page_content_3?: string | null;
  page_content_4?: string | null;
  hero_section?: string | null; // JSON string: { title, subtitle, image }
  services_bg_image?: string | null; // string: image data/url
  transparent_pricing?: string | null; // JSON string: { title, description, button_text, link }
}
// Domain models for section content
interface WhyChoosePoint { point?: string; }
interface WhyChooseEntry { id?: number; title?: string; points?: (string | WhyChoosePoint | null | undefined)[] }
interface AboutEntry { id?: number; description?: string; map_embed?: string }
interface ServicesEntry { id?: number; title?: string; description?: string }
interface FaqApiItem { id?: number; question?: string; answer?: string }
interface FaqWrapped { id?: number; faqs: FaqApiItem[] }
interface HeroApiEntry { id?: number; title?: string; sub_title?: string; image?: string }
interface TransparentPricingEntry { id?: number; title?: string; description?: string; button_text?: string; link?: string }

// Type guards & helper shapes for safer parsing
const isRecord = (val: unknown): val is Record<string, unknown> => typeof val === 'object' && val !== null;
const hasKey = <K extends string>(obj: Record<string, unknown>, key: K): obj is Record<K, unknown> => key in obj;
const isWhyChooseEntry = (val: unknown): val is WhyChooseEntry => isRecord(val);
const isAboutEntry = (val: unknown): val is AboutEntry => isRecord(val);
const isServicesEntry = (val: unknown): val is ServicesEntry => isRecord(val);
const isFaqApiItem = (val: unknown): val is FaqApiItem => isRecord(val);
const isFaqWrapped = (val: unknown): val is FaqWrapped => isRecord(val) && Array.isArray((val as Record<string, unknown>).faqs);
const isHeroApiEntry = (val: unknown): val is HeroApiEntry => isRecord(val);
const isTransparentPricingEntry = (val: unknown): val is TransparentPricingEntry => isRecord(val);

export default function SeoPageComponentsEditPage() {
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
    page_content_4: '',
    hero_section: '',
    services_bg_image: '',
    transparent_pricing: ''
  });
  // Hero section state
  const [heroTitle, setHeroTitle] = useState<string>('');
  const [heroSubtitle, setHeroSubtitle] = useState<string>('');
  const [heroImagePreview, setHeroImagePreview] = useState<string>(''); // url for preview
  const [heroImageFile, setHeroImageFile] = useState<File | null>(null); // file to upload
  // Services background image
  const [servicesBgImagePreview, setServicesBgImagePreview] = useState<string>('');
  const [servicesBgImageFile, setServicesBgImageFile] = useState<File | null>(null);
  // Transparent Pricing
  const [tpTitle, setTpTitle] = useState<string>('');
  const [tpDescription, setTpDescription] = useState<string>('');
  const [tpButtonText, setTpButtonText] = useState<string>('');
  const [tpLink, setTpLink] = useState<string>('');
  const [whyTitle, setWhyTitle] = useState<string>('');
  const [whyPoints, setWhyPoints] = useState<string[]>([]);
  // Store section ids (returned from fetch) for subsequent POST URLs
  const [sectionIds, setSectionIds] = useState<{ why?: number; about?: number; services?: number; faq?: number; hero?: number; servicesBg?: number; transparent?: number }>({});
  const [aboutDescription, setAboutDescription] = useState<string>('');
  const [aboutMapEmbed, setAboutMapEmbed] = useState<string>('');
  // Multiple services entries
  interface ServiceItem { title: string; description: string; }
  const [servicesItems, setServicesItems] = useState<ServiceItem[]>([]);
  // Title of the management service page itself (from previous list page)
  const [managementServiceTitle, setManagementServiceTitle] = useState<string>('');
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

      const [seoPageResp, heroResp, servicesBgResp, tpResp, whyResp, aboutResp, servicesResp, faqResp] = await Promise.all([
        getSeoPage(token, id),
        getHeroSection(token, id),
        getServicesBgSection(token, id),
        getTransparentPricing(token, id),
        getWhyChooseComponent(token, whyId).finally(() => setSectionLoading(prev => ({ ...prev, why: false }))),
        getAboutUsComponent(token, aboutId).finally(() => setSectionLoading(prev => ({ ...prev, about: false }))),
        getServicesComponent(token, servicesId).finally(() => setSectionLoading(prev => ({ ...prev, services: false }))),
        getFaqComponent(token, faqId).finally(() => setSectionLoading(prev => ({ ...prev, faq: false })))
      ]);
      console.log({ seoPageResp, heroResp, servicesBgResp, tpResp, whyResp, aboutResp, servicesResp, faqResp });

      // Extract management service page title (new shape nests under data.title)
      if (isRecord(seoPageResp)) {
        const dataObj = (seoPageResp as Record<string, unknown>).data;
        if (isRecord(dataObj) && typeof dataObj.title === 'string') {
          setManagementServiceTitle(dataObj.title);
        } else if (typeof (seoPageResp as Record<string, unknown>).title === 'string') {
          // Fallback to legacy flat shape
            setManagementServiceTitle(String((seoPageResp as Record<string, unknown>).title));
        }
        // We no longer read services background image from SEO meta; handled via dedicated API
      }
      // SERVICES BACKGROUND via dedicated API
      const servicesBgUnwrapped = unwrap(servicesBgResp);
      if (servicesBgUnwrapped) {
        let entry: unknown = servicesBgUnwrapped;
        if (isRecord(servicesBgUnwrapped) && Array.isArray((servicesBgUnwrapped as Record<string, unknown>).data)) {
          const arr = (servicesBgUnwrapped as Record<string, unknown>).data as unknown[];
          entry = arr[0];
        } else if (Array.isArray(servicesBgUnwrapped)) {
          entry = servicesBgUnwrapped[0];
        }
        if (isRecord(entry)) {
          const sid = typeof (entry as Record<string, unknown>).id === 'number' ? (entry as Record<string, unknown>).id as number : undefined;
          if (sid) setSectionIds(prev => ({ ...prev, servicesBg: sid }));
          const img = typeof (entry as Record<string, unknown>).image === 'string' ? (entry as Record<string, unknown>).image as string : '';
          if (img) {
            setServicesBgImagePreview(img);
            setContents(prev => ({ ...prev, services_bg_image: img }));
          }
        }
      }

      // HERO SECTION via dedicated API
      const heroDataUnwrapped = unwrap(heroResp);
      if (heroDataUnwrapped) {
        let heroEntry: unknown = heroDataUnwrapped;
        if (isRecord(heroDataUnwrapped) && Array.isArray((heroDataUnwrapped as Record<string, unknown>).data)) {
          const arr = (heroDataUnwrapped as Record<string, unknown>).data as unknown[];
          heroEntry = arr[0];
        } else if (Array.isArray(heroDataUnwrapped)) {
          heroEntry = heroDataUnwrapped[0];
        }
        if (isHeroApiEntry(heroEntry)) {
          const hid = typeof heroEntry.id === 'number' ? heroEntry.id : undefined;
          if (hid) setSectionIds(prev => ({ ...prev, hero: hid }));
          const t = typeof heroEntry.title === 'string' ? heroEntry.title : '';
          const st = typeof heroEntry.sub_title === 'string' ? heroEntry.sub_title : '';
          const img = typeof heroEntry.image === 'string' ? heroEntry.image : '';
          setHeroTitle(t);
          setHeroSubtitle(st);
          setHeroImagePreview(img);
          setContents(prev => ({ ...prev, hero_section: JSON.stringify({ title: t, subtitle: st, image: img }) }));
        }
      }

      // TRANSPARENT PRICING via dedicated API
      const tpDataUnwrapped = unwrap(tpResp);
      if (tpDataUnwrapped) {
        let tpEntry: unknown = tpDataUnwrapped;
        if (isRecord(tpDataUnwrapped) && Array.isArray((tpDataUnwrapped as Record<string, unknown>).data)) {
          const arr = (tpDataUnwrapped as Record<string, unknown>).data as unknown[];
          tpEntry = arr[0];
        } else if (Array.isArray(tpDataUnwrapped)) {
          tpEntry = tpDataUnwrapped[0];
        }
        if (isTransparentPricingEntry(tpEntry)) {
          const tid = typeof (tpEntry as TransparentPricingEntry).id === 'number' ? (tpEntry as TransparentPricingEntry).id : undefined;
          if (tid) setSectionIds(prev => ({ ...prev, transparent: tid }));
          const t = typeof (tpEntry as TransparentPricingEntry).title === 'string' ? (tpEntry as TransparentPricingEntry).title : '';
          const d = typeof (tpEntry as TransparentPricingEntry).description === 'string' ? (tpEntry as TransparentPricingEntry).description : '';
          const bt = typeof (tpEntry as TransparentPricingEntry).button_text === 'string' ? (tpEntry as TransparentPricingEntry).button_text : '';
          const l = typeof (tpEntry as TransparentPricingEntry).link === 'string' ? (tpEntry as TransparentPricingEntry).link : '';
          setTpTitle(t ?? '');
          setTpDescription(d ?? '');
          setTpButtonText(bt ?? '');
          setTpLink(l ?? '');
          setContents(prev => ({ ...prev, transparent_pricing: JSON.stringify({ title: t, description: d, button_text: bt, link: l }) }));
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
          page_type: 1
        };
        await updateWhyChooseComponent(token, id as string, sectionIds.why, structured);
        // store JSON string locally for consistency
        setContents(prev => ({ ...prev, page_content_1: JSON.stringify(structured) }));
      } else if (key === 'page_content_2') {
        const structuredAbout = {
          description: aboutDescription,
          map_embed: aboutMapEmbed,
          page_type: 1
        };
        await updateAboutUsComponent(token, id as string, sectionIds.about, structuredAbout);
        setContents(prev => ({ ...prev, page_content_2: JSON.stringify(structuredAbout) }));
      } else if (key === 'page_content_3') {
        // Clean services: remove entries with both fields empty
        const cleanedServices = servicesItems.filter(s => s.title.trim() !== '' || s.description.trim() !== '');
        const payload = { services: cleanedServices, page_type: 1 };
        await updateServicesComponent(token, id as string, sectionIds.services, payload);
        setContents(prev => ({ ...prev, page_content_3: JSON.stringify(cleanedServices) }));
      } else if (key === 'page_content_4') {
        // Clean FAQs: remove empty rows
        const cleanedFaqs = faqs.filter(f => f.question.trim() !== '' || f.answer.trim() !== '');
        const payload = { faqs: cleanedFaqs, page_type: 1 };
        await updateFaqComponent(token, id as string, sectionIds.faq, payload);
        setContents(prev => ({ ...prev, page_content_4: JSON.stringify(cleanedFaqs) }));
      } else if (key === 'hero_section') {
        // Build multipart form: only include image if selected
        const res = await updateHeroSection(
          token,
          id as string,
          sectionIds.hero,
          { title: heroTitle, sub_title: heroSubtitle, imageFile: heroImageFile ?? undefined }
        );
        // Try to read back id and image url from response
        if (isRecord(res) && isRecord(res) && Array.isArray((res as Record<string, unknown>).data as unknown[])) {
          const dataArr = (res as Record<string, unknown>).data as unknown[];
          const item = dataArr[0] as Record<string, unknown> | undefined;
          if (item) {
            const newId = typeof item.id === 'number' ? item.id : sectionIds.hero;
            if (newId && newId !== sectionIds.hero) setSectionIds(prev => ({ ...prev, hero: newId }));
            const img = typeof item.image === 'string' ? item.image : heroImagePreview;
            if (img) setHeroImagePreview(img);
            setContents(prev => ({ ...prev, hero_section: JSON.stringify({ title: heroTitle, subtitle: heroSubtitle, image: img }) }));
          }
        } else {
          // Fallback: keep current preview
          setContents(prev => ({ ...prev, hero_section: JSON.stringify({ title: heroTitle, subtitle: heroSubtitle, image: heroImagePreview }) }));
        }
      } else if (key === 'services_bg_image') {
        // Services background uses dedicated endpoint (assume update path is /components/servicesbg/page/:id/:sectionId)
        const res = await updateServicesBgSection(
          token,
          id as string,
          sectionIds.servicesBg,
          { imageFile: servicesBgImageFile ?? undefined }
        );
        if (isRecord(res) && Array.isArray((res as Record<string, unknown>).data as unknown[])) {
          const dataArr = (res as Record<string, unknown>).data as unknown[];
          const item = dataArr[0] as Record<string, unknown> | undefined;
          if (item) {
            const newId = typeof item.id === 'number' ? item.id : sectionIds.servicesBg;
            if (newId && newId !== sectionIds.servicesBg) setSectionIds(prev => ({ ...prev, servicesBg: newId }));
            const img = typeof item.image === 'string' ? item.image : servicesBgImagePreview;
            if (img) setServicesBgImagePreview(img);
            setContents(prev => ({ ...prev, services_bg_image: img }));
          }
        } else {
          setContents(prev => ({ ...prev, services_bg_image: servicesBgImagePreview }));
        }
      } else if (key === 'transparent_pricing') {
        const payload = { title: tpTitle, description: tpDescription, button_text: tpButtonText, link: tpLink, page_type: 1 };
        const res = await updateTransparentPricing(token, id as string, sectionIds.transparent, payload);
        if (isRecord(res) && Array.isArray((res as Record<string, unknown>).data as unknown[])) {
          const dataArr = (res as Record<string, unknown>).data as unknown[];
          const item = dataArr[0] as Record<string, unknown> | undefined;
          if (item) {
            const newId = typeof item.id === 'number' ? item.id : sectionIds.transparent;
            if (newId && newId !== sectionIds.transparent) setSectionIds(prev => ({ ...prev, transparent: newId }));
          }
        }
        setContents(prev => ({ ...prev, transparent_pricing: JSON.stringify(payload) }));
      } else {
        const value: string | null = contents[key] || '';
        const payload = { meta: { [key]: value }, page_type: 1 };
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
    { key: 'hero_section', title: 'Hero Section', description: 'Title, subtitle and image displayed at the top of the page.' },
    { key: 'page_content_1', title: 'Manage Why Choose Us', description: 'Content displayed in the Why Choose Us section.' },
    { key: 'page_content_2', title: 'Manage About Us', description: 'Content for the About Us section.' },
    { key: 'services_bg_image', title: 'Service Background Image', description: 'Background image used behind the Services section.' },
    { key: 'page_content_3', title: 'Manage Our Services', description: 'Details of services offered.' },
    { key: 'transparent_pricing', title: 'Manage Transperent Pricing', description: 'Title, description, button text and link.' },
    { key: 'page_content_4', title: 'Manage FAQ', description: 'Frequently Asked Questions content.' }
  ];

  return (
    <div className="mx-auto max-w-6xl p-4 md:p-6">
      <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          {managementServiceTitle.trim() || ''}
        </h2>
        <div className="flex gap-3">
          <button
            onClick={() => router.push(`/seo_pages/edit/${id}`)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-white/80"
          >Back</button>
        </div>
      </div>
  {/* Global spinner removed; skeletons show inline */}
      <div className="space-y-10">
        {sectionDefs.map(section => {
          if (section.key === 'hero_section') {
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
                <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      type="text"
                      value={heroTitle}
                      onChange={e => setHeroTitle(e.target.value)}
                      placeholder="Enter hero title"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Subtitle</label>
                    <input
                      type="text"
                      value={heroSubtitle}
                      onChange={e => setHeroSubtitle(e.target.value)}
                      placeholder="Enter hero subtitle"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Image</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setHeroImageFile(file);
                        const objectUrl = URL.createObjectURL(file);
                        setHeroImagePreview(objectUrl);
                        setContents(prev => ({ ...prev, hero_section: JSON.stringify({ title: heroTitle, subtitle: heroSubtitle, image: objectUrl }) }));
                      }}
                      className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:hover:file:bg-gray-700"
                    />
                    {heroImagePreview && (
                      <div className="mt-3">
                        <Image
                          src={heroImagePreview}
                          alt="Hero preview"
                          width={640}
                          height={360}
                          unoptimized
                          className="h-36 w-auto rounded-md border border-gray-200 object-cover dark:border-white/10"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            );
          }
          if (section.key === 'transparent_pricing') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Manage Transperent Pricing</h3>
                  <button
                    onClick={() => handleUpdate(section.key)}
                    disabled={!!saving[section.key] || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Enter the title, rich description, button text and link for the Transparent Pricing section.</p>
                <div className="space-y-6">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                    <input
                      type="text"
                      value={tpTitle}
                      onChange={e => setTpTitle(e.target.value)}
                      placeholder="Transparent Pricing Title"
                      className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                    <div className="rounded-lg border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900">
                      {ClassicEditorBuilt && !editorLoading ? (
                        <CKEditor
                          editor={ClassicEditorBuilt}
                          data={tpDescription}
                          onChange={(_, editor) => setTpDescription(editor.getData())}
                        />
                      ) : (
                        <div className="px-3 py-2 text-xs text-gray-400">Loading editor…</div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Button Text</label>
                      <input
                        type="text"
                        value={tpButtonText}
                        onChange={e => setTpButtonText(e.target.value)}
                        placeholder="Get a Quote"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Button Link</label>
                      <input
                        type="text"
                        value={tpLink}
                        onChange={e => setTpLink(e.target.value)}
                        placeholder="#"
                        className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm shadow-theme-xs focus:border-blue-300 focus:outline-hidden focus:ring-3 focus:ring-blue-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                  </div>
                </div>
              </section>
            );
          }
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
          } else if (section.key === 'services_bg_image') {
            return (
              <section key={section.key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-medium">Service Background Image</h3>
                  <button
                    onClick={() => handleUpdate(section.key)}
                    disabled={!!saving[section.key] || loading}
                    className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium shadow hover:bg-blue-700 disabled:opacity-50"
                  >{saving[section.key] ? 'Saving...' : 'Save Section'}</button>
                </div>
                <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">Upload an image to be used as the background for the Services section.</p>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setServicesBgImageFile(file);
                      const objectUrl = URL.createObjectURL(file);
                      setServicesBgImagePreview(objectUrl);
                      setContents(prev => ({ ...prev, services_bg_image: objectUrl }));
                    }}
                    className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium hover:file:bg-gray-200 dark:text-gray-300 dark:file:bg-gray-800 dark:hover:file:bg-gray-700"
                  />
                  {servicesBgImagePreview && (
                    <div className="mt-3">
                      <Image
                        src={servicesBgImagePreview}
                        alt="Services background preview"
                        width={640}
                        height={360}
                        unoptimized
                        className="h-36 w-auto rounded-md border border-gray-200 object-cover dark:border-white/10"
                      />
                    </div>
                  )}
                </div>
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
