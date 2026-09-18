"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError, errorMessage, isUnauthenticated } from "@/lib/api";

export function useAcademicQuery<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
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
      setResolvedPath(null);
      return;
    }

    setError(null);
    setErrorCode(null);

    api<T>(path)
      .then((result) => {
        if (cancelled) {
          return;
        }

        setData(result);
        setResolvedPath(path);
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
        setData(null);
        setResolvedPath(path);
      });

    return () => {
      cancelled = true;
    };
  }, [path, reloadKey]);

  const loading = Boolean(path) && resolvedPath !== path && !error;

  return { data, error, errorCode, loading, reload };
}
