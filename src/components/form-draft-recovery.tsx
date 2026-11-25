"use client";

import { useEffect } from "react";

type SavedControl = {
  name: string;
  type: string;
  value: string;
  checked?: boolean;
};

export function FormDraftRecovery({ formId, storageKey, restore }: { formId: string; storageKey: string; restore: boolean }) {
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;

    if (restore) {
      try {
        const controls = JSON.parse(sessionStorage.getItem(storageKey) || "[]") as SavedControl[];
        const elements = Array.from(form.elements).filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement,
        );
        for (const saved of controls) {
          const match = elements.find((element) => element.name === saved.name && element.type === saved.type && (saved.type !== "checkbox" && saved.type !== "radio" || element.value === saved.value));
          if (!match || match instanceof HTMLInputElement && match.type === "file") continue;
          if (match instanceof HTMLInputElement && (match.type === "checkbox" || match.type === "radio")) match.checked = Boolean(saved.checked);
          else match.value = saved.value;
        }
      } catch {
        sessionStorage.removeItem(storageKey);
      }
    } else {
      sessionStorage.removeItem(storageKey);
    }

    const saveDraft = () => {
      const controls: SavedControl[] = Array.from(form.elements)
        .filter((element): element is HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement =>
          element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement,
        )
        .filter((element) => element.name && element.type !== "file" && element.type !== "submit")
        .map((element) => ({
          name: element.name,
          type: element.type,
          value: element.value,
          checked: element instanceof HTMLInputElement && (element.type === "checkbox" || element.type === "radio") ? element.checked : undefined,
        }));
      sessionStorage.setItem(storageKey, JSON.stringify(controls));
    };

    form.addEventListener("submit", saveDraft);
    return () => form.removeEventListener("submit", saveDraft);
  }, [formId, restore, storageKey]);

  return null;
}
