"use client";

import { useEffect } from "react";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Drop broken v1 caches that may have stored Internal Server Error as "/"
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k === "haijie-core-v1" || k.startsWith("haijie-core-v1"))
          .map((k) => caches.delete(k)),
      ),
    );

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // ignore registration failures in unsupported environments
    });
  }, []);

  return null;
}
