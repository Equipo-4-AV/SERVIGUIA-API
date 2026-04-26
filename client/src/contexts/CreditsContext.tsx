import { createContext, useContext } from "react";

export interface CreditsContextValue {
  credits: number;
  contactCost: number;
  contactProvider: (providerName: string) => { ok: boolean; reason?: string };
}

export const CreditsContext = createContext<CreditsContextValue | null>(null);

export function useCredits(): CreditsContextValue {
  const ctx = useContext(CreditsContext);
  if (!ctx) {
    throw new Error("useCredits must be used within a CreditsContext.Provider");
  }
  return ctx;
}