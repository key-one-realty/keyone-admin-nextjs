export const API_ROUTES = {
  LOGIN: "/auth/login",
  DASHBOARD_DATA: "/dashboard-data",
  GET_USERS_LIST: "/users",
  GET_USER_DETAIL: "/users",
  CREATE_USER: "/users",
  UPDATE_USER: "/users",
  CHANGE_USER_PASSWORD: (userId) => `/users/${userId}/password`,
  GET_SEO_PAGES: "/seo-pages",
  GET_SEO_PAGE_SINGLE: "/seo-pages",
  CREATE_SEO_PAGE: "/seo-pages",
  UPDATE_SEO_PAGE: "/seo-pages",
  Delete_SEO_PAGE: "/seo-pages",
  CHANGE_SEO_STATUS: (seoId) => `/seo-pages/${seoId}/change-status`,
  SEO_PAGES_PARENT: "/seo-pages-parent",
  WHY_CHOOSE_COMPONENT: (pageId, sectionId) => `/components/whychoose/page/${pageId}${sectionId ? `/${sectionId}` : ''}`,
  ABOUT_US_COMPONENT: (pageId, sectionId) => `/components/aboutus/page/${pageId}${sectionId ? `/${sectionId}` : ''}`,
  SERVICES_COMPONENT: (pageId, sectionId) => `/components/services/page/${pageId}${sectionId ? `/${sectionId}` : ''}`,
  FAQ_COMPONENT: (pageId, sectionId) => `/components/faq/page/${pageId}${sectionId ? `/${sectionId}` : ''}`,
  HERO_SECTION: (pageId, sectionId) => `/components/herosection/page/${pageId}${sectionId ? `/${sectionId}` : ''}`
  ,
  SERVICES_BG: (pageId, sectionId) => `/components/servicesbg/page/${pageId}${sectionId ? `/${sectionId}` : ''}`
  ,
  TRANSPARENT_PRICING: (pageId, sectionId) => `/components/transparentpricing/page/${pageId}${sectionId ? `/${sectionId}` : ''}`
};
