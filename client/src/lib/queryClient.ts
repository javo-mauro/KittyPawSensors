import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const requestInit: RequestInit = {
    ...options,
    headers: {
      ...(options?.headers || {}),
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  };

  try {
    console.log(`Enviando solicitud a ${url}`, requestInit);
    const res = await fetch(url, requestInit);
    
    await throwIfResNotOk(res);
    
    // Para respuestas vacías (por ejemplo, 204 No Content)
    if (res.status === 204) {
      console.log("Respuesta vacía (204 No Content)");
      return {} as unknown as T;
    }
    
    try {
      const data = await res.json();
      console.log("Respuesta JSON recibida:", data);
      return data as unknown as T;
    } catch (e) {
      console.warn("Error al parsear JSON:", e);
      // Si no podemos parsear como JSON, devolvemos un objeto vacío
      return {} as unknown as T;
    }
  } catch (error) {
    console.error("Error en la solicitud a la API:", error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
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
