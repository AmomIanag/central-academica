"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError, errorMessage } from "@/lib/api";

export function useAcademicQuery<T>(path: string) {
  const router = useRouter();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((value) => value + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    setError(null);
    setErrorCode(null);

    api<T>(path)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setData(result);
        setLoading(false);
      })
      .catch((caught) => {
        if (cancelled) {
          return;
        }

        if (caught instanceof ApiError && caught.status === 401) {
          router.replace("/login");
          return;
        }

        setError(errorMessage(caught));
        setErrorCode(caught instanceof ApiError ? caught.code : "NETWORK_ERROR");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey, router]);

  return { data, error, errorCode, loading, reload };
}
