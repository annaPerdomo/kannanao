"use client";
import { createContext, useContext, useState, ReactNode } from "react";
import { CreateDeckDialog } from "@/components/CreateDeckDialog";

interface DeckDialogContextValue {
  openNewDeckDialog: () => void;
}

const DeckDialogContext = createContext<DeckDialogContextValue | null>(null);

export function useDeckDialog() {
  const ctx = useContext(DeckDialogContext);
  if (!ctx)
    throw new Error("useDeckDialog must be used within DeckDialogProvider");
  return ctx;
}

export function DeckDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <DeckDialogContext.Provider
      value={{ openNewDeckDialog: () => setOpen(true) }}
    >
      {children}
      <CreateDeckDialog open={open} onClose={() => setOpen(false)} />
    </DeckDialogContext.Provider>
  );
}
