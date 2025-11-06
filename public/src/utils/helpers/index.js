import { readCookie } from "./cookie";

export const nextRedirect = (pathName = "login") => {
  return {
    redirect: {
      permanent: false,
      destination: `/${pathName}`,
    },
  };
};

export const getAuthToken = (context = null, token) => {
  const isClient = typeof window !== "undefined";
  const authToken = token
    ? token
    : isClient
    ? readCookie("auth_token")
    : context?.req?.cookies?.auth_token;

  return authToken ? decodeURIComponent(authToken) : null;
};

export const currentTimeEpochTimeInMilliseconds = () => {
  return new Date().getTime();
};

export const checkValidAuthToken = (context = null, authToken) => {
  const isClient = typeof window != "undefined";
  const tokenDecoded = authToken
    ? authToken
    : isClient
    ? readCookie("auth_token")
    : context?.req?.cookies?.auth_token;
  const token = decodeURIComponent(tokenDecoded);
  const fetchAuthTokenTime = isClient
    ? readCookie("auth_token_validity")
    : context?.req?.cookies?.auth_token_validity;
  if (!token || !fetchAuthTokenTime) return false;

  const currentTimeEpoch = currentTimeEpochTimeInMilliseconds();
  const tokenTimeEpoch = Number(fetchAuthTokenTime);
  const timeDiffBolean = tokenTimeEpoch > currentTimeEpoch - 3600000;
  return timeDiffBolean;
};

export const clearUserCookie = async () => {
  const cookiesToDelete = ["auth_token", "sessionData"];
  const deleteCookieStrings = cookiesToDelete.map(
    (cookieName) =>
      `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=Strict`
  );
  return deleteCookieStrings;
};

export const formatString = (str, separator = '') => {
  if (separator) {
    str = str.split(separator).join(' ');
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}