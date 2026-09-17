"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage, isUnauthenticated } from "@/lib/api";

export function useAcademicQuery<T>(path: string | null) {
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

    if (!path) {
      setData(null);
      setError(null);
      setErrorCode("NOT_FOUND");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorCode(null);
    setData(null);

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

        if (isUnauthenticated(caught)) {
          return;
        }

        setError(errorMessage(caught));
        setErrorCode(caught instanceof ApiError ? caught.code : "NETWORK_ERROR");
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  return { data, error, errorCode, loading, reload };
}
