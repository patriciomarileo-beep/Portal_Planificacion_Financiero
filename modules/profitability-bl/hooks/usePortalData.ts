"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type { PrivateData } from "@/app/private-data-context";

import {
  PortalDataUnauthorizedError,
  requestPortalData,
} from "../services/portal-data-service";

type UsePortalDataOptions = {
  enabled: boolean;
  onUnauthorized: () => void;
};

type UsePortalDataResult = {
  data: PrivateData | null;
  error: string;
  refresh: () => Promise<void>;
  reset: () => void;
};

export function usePortalData({
  enabled,
  onUnauthorized,
}: UsePortalDataOptions): UsePortalDataResult {
  const [data, setData] =
    useState<PrivateData | null>(null);

  const [error, setError] = useState("");

  const requestRef =
    useRef<AbortController | null>(null);

  const handleRequestError = useCallback(
    (
      requestError: unknown,
      controller: AbortController,
    ) => {
      if (controller.signal.aborted) {
        return;
      }

      if (
        requestError instanceof
        PortalDataUnauthorizedError
      ) {
        setData(null);
        onUnauthorized();
        return;
      }

      setError(
        requestError instanceof Error
          ? requestError.message
          : "No fue posible cargar los informes.",
      );
    },
    [onUnauthorized],
  );

  const refresh = useCallback(async () => {
    requestRef.current?.abort();

    const controller = new AbortController();
    requestRef.current = controller;

    setError("");

    try {
      const payload = await requestPortalData(
        controller.signal,
      );

      if (!controller.signal.aborted) {
        setData(payload);
      }
    } catch (requestError) {
      handleRequestError(
        requestError,
        controller,
      );
    }
  }, [handleRequestError]);

  const reset = useCallback(() => {
    requestRef.current?.abort();
    setError("");
    setData(null);
  }, []);

  useEffect(() => {
    requestRef.current?.abort();

    if (!enabled) {
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;

    void requestPortalData(controller.signal)
      .then((payload) => {
        if (!controller.signal.aborted) {
          setData(payload);
        }
      })
      .catch((requestError: unknown) => {
        handleRequestError(
          requestError,
          controller,
        );
      });

    return () => {
      controller.abort();
    };
  }, [enabled, handleRequestError]);

  return {
    data,
    error,
    refresh,
    reset,
  };
}