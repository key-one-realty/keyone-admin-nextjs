export const seoFormFields = [
  { name: "title", label: "Title", type: "text" },
  { name: "slug", label: "Slug", type: "text" },
  // { name: "parent_id", label: "Parent ID", type: "number" },
  { name: "menu_order", label: "Menu Order", type: "number" },
  { name: "is_active", label: "Is Active", type: "checkbox" },
  { name: "seo_status", label: "SEO Status", type: "checkbox" },

  // Meta fields
  { name: "meta[h1_tag]", label: "H1 Tag", type: "text" },
  { name: "meta[meta_title]", label: "Meta Title", type: "text" },
  { name: "meta[meta_description]", label: "Meta Description", type: "textarea" },
  { name: "meta[meta_keywords]", label: "Meta Keywords", type: "textarea" },
  { name: "meta[canonical_url]", label: "Canonical URL", type: "text" },
  { name: "meta[schema_markup]", label: "Schema Markup", type: "editor" },
  { name: "meta[schema_markup_faq]", label: "FAQ Markup", type: "editor" },
  { name: "meta[og_title]", label: "OG Title", type: "text" },
  { name: "meta[og_description]", label: "OG Description", type: "textarea" },
  { name: "meta[og_image]", label: "OG Image", type: "text" },
  { name: "meta[twitter_card]", label: "Twitter Card", type: "text" },
  { name: "meta[language]", label: "Language", type: "text" },
];