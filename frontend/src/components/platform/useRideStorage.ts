import { useSyncExternalStore } from "react";
export function subscribeStorage(update: () => void) {
  window.addEventListener("storage", update);
  window.addEventListener("ride-storage", update);
  return () => {
    window.removeEventListener("storage", update);
    window.removeEventListener("ride-storage", update);
  };
}
export function useRideStorage(
  kind: "sessionStorage" | "localStorage",
  key: string,
) {
  const value = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return window[kind].getItem(key) ?? "";
      } catch {
        return "";
      }
    },
    () => "",
  );
  function save(text: string) {
    if (text) window[kind].setItem(key, text);
    else window[kind].removeItem(key);
    window.dispatchEvent(new Event("ride-storage"));
  }
  return [value, save] as const;
}
