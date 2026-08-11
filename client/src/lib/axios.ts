import axios from "axios";
import { getAccessToken, setAccessToken } from "../contexts/AuthContext";

const api = axios.create({
  baseURL: import.meta.env["VITE_API_URL"] ?? "http://localhost:4000",
  withCredentials: true,
  timeout: 30_000,
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue: {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}[] = [];

function processQueue(error: unknown, token: string | null) {
  for (const { resolve, reject } of failedQueue) {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  }
  failedQueue = [];
}

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // A 401 from one of these means "this attempt to establish a session failed"
    // (wrong password, bad MFA code, expired reset token) — not "an existing
    // session's access token expired." Triggering the refresh-and-redirect flow
    // for these would hard-reload the page and wipe out the inline error the
    // page is about to render before the user ever sees it.
    const isSessionEstablishingUrl = [
      "/auth/refresh",
      "/auth/login",
      "/auth/register",
      "/auth/mfa/verify",
    ].some((path) => originalRequest.url?.includes(path));

    if (error.response?.status === 401 && !originalRequest._retry && !isSessionEstablishingUrl) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${token}`;
          }
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post(
          `${api.defaults.baseURL}/api/v1/auth/refresh`,
          {},
          { withCredentials: true },
        );
        const newToken = data.data.accessToken;
        setAccessToken(newToken);
        processQueue(null, newToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.location.href = "/login";
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default api;

export async function authorizedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const baseURL = import.meta.env["VITE_API_URL"] ?? "http://localhost:4000";
  const execute = () => {
    const headers = new Headers(init.headers);
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    if (!headers.has("Content-Type") && init.body) headers.set("Content-Type", "application/json");
    return fetch(`${baseURL}${path}`, { ...init, headers, credentials: "include" });
  };

  let response = await execute();
  if (response.status !== 401) return response;

  const refresh = await axios.post(
    `${baseURL}/api/v1/auth/refresh`,
    {},
    { withCredentials: true },
  );
  setAccessToken(refresh.data.data.accessToken);
  response = await execute();
  return response;
}
