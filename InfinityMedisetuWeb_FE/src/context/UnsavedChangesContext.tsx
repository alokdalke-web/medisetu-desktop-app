import React from "react";

type UnsavedChangesCtx = {
  isDirty: boolean;
  setDirty: (v: boolean) => void;
};

const Ctx = React.createContext<UnsavedChangesCtx | null>(null);

export const UnsavedChangesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isDirty, setIsDirty] = React.useState(false);

  const setDirty = React.useCallback((v: boolean) => {
    setIsDirty(v);
  }, []);

  return <Ctx.Provider value={{ isDirty, setDirty }}>{children}</Ctx.Provider>;
};

export function useUnsavedChanges() {
  const ctx = React.useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useUnsavedChanges must be used within UnsavedChangesProvider"
    );
  }
  return ctx;
}