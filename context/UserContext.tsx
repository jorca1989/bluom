import React, { createContext, useContext } from 'react';

/**
 * Placeholder scaffold for a legacy UserContext architecture.
 *
 * You said you'll paste the battle-tested implementation next. This file exists
 * so imports like `@/context/UserContext` resolve immediately.
 *
 * IMPORTANT: Keep this API surface stable while you paste in the real code.
 */

type UserContextValue = any;

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Placeholder. Replace with real provider implementation when you paste it.
  return <UserContext.Provider value={null}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const ctx = useContext(UserContext);
  if (ctx == null) {
    // Placeholder behavior: return an empty object instead of crashing the app.
    // Replace with your real logic.
    return {};
  }
  return ctx;
}


