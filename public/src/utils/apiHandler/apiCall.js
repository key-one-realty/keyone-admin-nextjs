import axios from "axios";

const isAbsolute = (url = "") => /^https?:\/\//i.test(url);
const buildUrl = (prefix, url) => {
  if (isAbsolute(url)) return url; // pass through absolute URL (server-side direct calls)
  // ensure single slash between prefix and path
  if (url.startsWith("/")) return `${prefix}${url}`;
  return `${prefix}/${url}`;
};

const postApiCall = async (url, payload, headers = {}, method) => {
  try {
    const response = await axios({
      url: buildUrl("/api/post", url),
      method: method ?? "POST",
      data: { payload },
      headers: {
        ...headers,
      },
    });
    return response;
  } catch (err) {
    console.error("API call failed:", {
      url: `/api/post${url}`,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

const formPostAPICall = async (url, payload, headers = {}) => {
  try {
    const response = await axios({
  url: buildUrl("/api/formPost", url),
      method: "POST",
      data: payload,
      headers: {
        ...headers,
      },
    });
    console.log(response);
    return response;
  } catch (err) {
    console.error("API call failed:", {
      url: `/api/post/${url}`,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};

const getApiCall = async (url, headers = {}) => {
  try {
    const response = await axios({
  url: isAbsolute(url) ? url : buildUrl("/api/get", url),
      method: "GET",
      headers: {
        ...headers,
      },
    });
    return response;
  } catch (err) {
    throw err;
  }
};

const putApiCall = async (url, payload, header = {}) => {
  const { headers } = header;
  try {
    const response = await axios({
  url: isAbsolute(url) ? url : buildUrl("/api/put", url),
      method: "PUT",
      data: { payload },
      headers: {
        ...headers,
      },
    });
    return response;
  } catch (err) {
    throw err;
  }
};

const deleteApiCall = async (url, headers = {}) => {
  try {
    const response = await axios({
  url: isAbsolute(url) ? url : buildUrl("/api/delete", url),
      method: "DELETE",
      headers: {
        ...headers,
      },
    });
    return response;
  } catch (err) {
    console.error("API DELETE call failed:", {
      url: `/api/delete/${url}`,
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
    });
    throw err;
  }
};


export { postApiCall, getApiCall, putApiCall, formPostAPICall, deleteApiCall };
