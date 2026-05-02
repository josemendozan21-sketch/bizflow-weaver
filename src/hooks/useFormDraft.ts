import { useEffect, useRef } from "react";

/**
 * Persiste/restaura los inputs no-controlados de un formulario en localStorage.
 * Excluye campos de tipo file y password.
 */
export function useFormDraft(formRef: React.RefObject<HTMLFormElement>, key: string, ready = true) {
  const restored = useRef(false);

  // Restore on mount
  useEffect(() => {
    if (!ready || restored.current) return;
    const form = formRef.current;
    if (!form) return;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) { restored.current = true; return; }
      const data = JSON.parse(raw) as Record<string, string>;
      // Defer one tick to ensure inputs are rendered
      requestAnimationFrame(() => {
        Object.entries(data).forEach(([name, value]) => {
          const el = form.querySelector(`[name="${name}"]`) as HTMLInputElement | HTMLTextAreaElement | null;
          if (!el) return;
          if ((el as HTMLInputElement).type === "file" || (el as HTMLInputElement).type === "password") return;
          el.value = value;
          el.dispatchEvent(new Event("input", { bubbles: true }));
        });
      });
    } catch {/* ignore */}
    restored.current = true;
  }, [formRef, key, ready]);

  // Save on input
  useEffect(() => {
    const form = formRef.current;
    if (!form) return;
    const handler = () => {
      const data: Record<string, string> = {};
      const elements = form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input[name], textarea[name]");
      elements.forEach((el) => {
        const type = (el as HTMLInputElement).type;
        if (type === "file" || type === "password") return;
        if (!el.name) return;
        data[el.name] = el.value;
      });
      try { localStorage.setItem(key, JSON.stringify(data)); } catch {/* quota */}
    };
    form.addEventListener("input", handler);
    form.addEventListener("change", handler);
    return () => {
      form.removeEventListener("input", handler);
      form.removeEventListener("change", handler);
    };
  }, [formRef, key]);
}

export function clearFormDraft(key: string) {
  try { localStorage.removeItem(key); } catch {/* ignore */}
}

/** Hook para persistir/restaurar un valor de estado controlado */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const ref = useRef<T>(initial);
  // We use lazy init via React.useState pattern
  const [val, setVal] = (require("react") as typeof import("react")).useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw) as T;
    } catch {/* ignore */}
    return initial;
  });
  ref.current = val;
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {/* ignore */}
  }, [key, val]);
  return [val, setVal];
}
