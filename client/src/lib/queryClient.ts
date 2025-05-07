import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { getDeviceId } from "./device-id";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { headers?: HeadersInit }
): Promise<Response> {
  // Get device ID for anonymous user tracking
  const deviceId = getDeviceId();
  
  // Combine default headers with device ID and custom headers if provided
  const defaultHeaders: HeadersInit = {
    ...(data ? { "Content-Type": "application/json" } : {}),
    "X-Device-ID": deviceId
  };
  
  const headers = options?.headers 
    ? { ...defaultHeaders, ...options.headers } 
    : defaultHeaders;

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Skip automatic error throwing if status is 401 (Unauthorized)
  // This allows us to handle auth errors specially in some cases
  if (res.status !== 401) {
    await throwIfResNotOk(res);
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Get device ID for anonymous user tracking
    const deviceId = getDeviceId();
    
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
      headers: {
        "X-Device-ID": deviceId
      }
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
