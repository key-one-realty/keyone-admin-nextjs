import AJAX from ".";
import { API_ROUTES } from "./apiRoutes";

const isClient = typeof window !== "undefined";

export const makeRequest = async ({
  url,
  method = "GET",
  data = {},
  token,
  formData
}) => {
  const ROOT_URL = process.env.API_BASE_URL || "";
  // If url already absolute or we are intentionally using proxy via /api/* build in apiCall, just pass through
  const isAbsolute = /^https?:\/\//i.test(url);
  let modifiedUrl = url;
  if (!isClient && !isAbsolute) {
    // backend direct call wants full root
    modifiedUrl = `${ROOT_URL}${url}`;
  }

  const headers = token ? { token } : {};

  switch (method.toUpperCase()) {
    case "GET":
      return AJAX.get(modifiedUrl, { ...(token && { token }) });

    case "POST":
      return AJAX.post(modifiedUrl, data, formData, headers);

    case "PUT":
      return AJAX.put(modifiedUrl, data, formData, headers);

    case "DELETE":
      return AJAX.delete(modifiedUrl, data, formData, headers);

    default:
      throw new Error(`Unsupported method: ${method}`);
  }
};

// Function to handle user login
export const loginUser = async (token, data) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.LOGIN,
      method: "POST",
      data: data,
    });
    return response.status ===200 ? response?.data : {};
  } catch (error) {
    return error?.response?.data;
    console.log("ERROR in loginUser", error);
    throw error;
  }
};

// Function to get dashboard data
export const getDashboardData = async (token) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.DASHBOARD_DATA,
      method: "GET",
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getUsersList", error);
    throw error;
  }
}

// Function to get users list
export const getUsersList = async (token) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.GET_USERS_LIST,
      method: "GET",
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getUsersList", error);
    throw error;
  }
}

export const createUser = async (token, data) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.CREATE_USER,
      method: "POST",
      data: data,
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in create user", error);
    throw error;
  }
}

export const updateUser = async (token, userId, data) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.UPDATE_USER}/${userId}`,
      method: "PUT",
      data: data,
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in update user", error);
    throw error;
  }
}

export const changeUserPassword = async (token, userId, data) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.CHANGE_USER_PASSWORD(userId)}`,
      method: "PUT",
      data: data,
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in update user", error);
    throw error;
  }
}

export const deleteUser = async (token, userId) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.DELETE_USER}/${userId}`,
      method: "DELETE",
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in delete user", error);
    throw error;
  }
}

// Function to get seo pages
export const getSeopagesList = async (token, params = {}) => {
  try {
    // Build query string. Include keys even if value is empty string to satisfy backend expecting explicit keys.
    const parts = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => `${encodeURIComponent(k)}=${v === '' ? '' : encodeURIComponent(String(v))}`);
    const qs = parts.join('&');
    const finalUrl = qs
      ? `${API_ROUTES.GET_SEO_PAGES}?${qs}`
      : API_ROUTES.GET_SEO_PAGES;
    const response = await makeRequest({
      url: finalUrl,
      method: "GET",
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getSeopagesList", error);
    throw error;
  }
}

// Function to get a single seo page
export const getSeoPage = async (token, id) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.GET_SEO_PAGE_SINGLE}/${id}`,
      method: "GET",
      token: token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getSeoPage", error);
    throw error;
  }
}

// Function to create seo page
export const createSeoPage = async (token, data) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.CREATE_SEO_PAGE,
      method: "POST",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in createSeoPage", error);
    throw error;
  }
}

// Function to update seo page
export const updateSeoPage = async (token, id, data) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.UPDATE_SEO_PAGE}/${id}`,
      method: "PUT",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in updateSeoPage", error);
    throw error;
  }
}

// Function to delete seo page
export const deleteSeoPage = async (token, id, { page_type } = {}) => {
  try {
    let url = `${API_ROUTES.Delete_SEO_PAGE}/${id}`;
    if (page_type !== undefined && page_type !== null) {
      url += `?page_type=${page_type}`;
    }
    const response = await makeRequest({
      url,
      method: "DELETE",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in deleteSeoPage", error);
    throw error;
  }
}

// Function to get parent seo pages (page_type=2 specified by caller via params)
export const getSeoParentPages = async (token, { page_type = 2 } = {}) => {
  try {
    const response = await makeRequest({
      url: `${API_ROUTES.SEO_PAGES_PARENT}?page_type=${page_type}`,
      method: "GET",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getSeoParentPages", error);
    throw error;
  }
}

// Function to change seo page status
export const changeSeoStatus = async (token, id, status) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.CHANGE_SEO_STATUS(id),
      method: "PUT",
  data: { seo_status: status },
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in changeSeoStatus", error);
    throw error;
  }
}

// Update Why Choose Us component content
export const updateWhyChooseComponent = async (token, pageId, sectionId, data) => {
  try {
    const hasId = !!sectionId;
    const response = await makeRequest({
      url: API_ROUTES.WHY_CHOOSE_COMPONENT(pageId, hasId ? sectionId : undefined),
      method: hasId ? "PUT" : "POST",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in updateWhyChooseComponent", error);
    throw error;
  }
}

// Update About Us component content
export const updateAboutUsComponent = async (token, pageId, sectionId, data) => {
  try {
    const hasId = !!sectionId;
    const response = await makeRequest({
      url: API_ROUTES.ABOUT_US_COMPONENT(pageId, hasId ? sectionId : undefined),
      method: hasId ? "PUT" : "POST",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in updateAboutUsComponent", error);
    throw error;
  }
}

// Update Services component content
export const updateServicesComponent = async (token, pageId, sectionId, data) => {
  try {
    const hasId = !!sectionId;
    const response = await makeRequest({
      url: API_ROUTES.SERVICES_COMPONENT(pageId, hasId ? sectionId : undefined),
      method: hasId ? "PUT" : "POST",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in updateServicesComponent", error);
    throw error;
  }
}

// Update FAQ component content
export const updateFaqComponent = async (token, pageId, sectionId, data) => {
  try {
    const hasId = !!sectionId;
    const response = await makeRequest({
      url: API_ROUTES.FAQ_COMPONENT(pageId, hasId ? sectionId : undefined),
      method: hasId ? "PUT" : "POST",
      data,
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in updateFaqComponent", error);
    throw error;
  }
}

// =========================
// GET component content APIs
// =========================
export const getWhyChooseComponent = async (token, id) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.WHY_CHOOSE_COMPONENT(id),
      method: "GET",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getWhyChooseComponent", error);
    throw error;
  }
}

export const getAboutUsComponent = async (token, id) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.ABOUT_US_COMPONENT(id),
      method: "GET",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getAboutUsComponent", error);
    throw error;
  }
}

export const getServicesComponent = async (token, id) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.SERVICES_COMPONENT(id),
      method: "GET",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getServicesComponent", error);
    throw error;
  }
}

export const getFaqComponent = async (token, id) => {
  try {
    const response = await makeRequest({
      url: API_ROUTES.FAQ_COMPONENT(id),
      method: "GET",
      token,
    });
    return response.status === 200 ? response?.data : {};
  } catch (error) {
    console.log("ERROR in getFaqComponent", error);
    throw error;
  }
}
