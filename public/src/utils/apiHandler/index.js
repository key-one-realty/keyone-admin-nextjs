import {
  getApiCall,
  postApiCall,
  formPostAPICall,
  putApiCall,
  deleteApiCall,
} from "./apiCall";
import { getAuthToken } from "../helpers";

export const fetchAuthorizationKey = (token = "") => {
  const authToken = getAuthToken("", token);
  const headers = {
    ...(authToken && { Authorization: `Bearer ${authToken}` }),
  };
  return headers;
};

const AJAX = {
  post: async (url, data, formData = null, opts = {}, method) => {
    if (formData) {
      const formDataHeader = {
        ...fetchAuthorizationKey(),
        "Content-Type": "multipart/form-data",
      };
      return formPostAPICall(url, formData, formDataHeader);
    } else {
      return postApiCall(
        url,
        JSON.stringify(data),
        fetchAuthorizationKey(opts?.token),
        method
      );
    }
  },
  get: async (url, opts = {}) => {
    return getApiCall(url, fetchAuthorizationKey(opts?.token));
  },
  put: async (url, data, opts = {}) => {
    return putApiCall(
      url,
      JSON.stringify(data),
      fetchAuthorizationKey(opts?.token)
    );
  },
  delete: async (url, opts = {}) => {
    return deleteApiCall(
      url,
      fetchAuthorizationKey(opts?.token)
    );
  }
};

export default AJAX;
