"use client";

import { SessionProvider } from "next-auth/react";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  return (
    <SessionProvider
      // Default behavior polls /api/auth/session every 4 minutes AND
      // refetches on every window focus / route navigation. The session
      // callback hits the DB to hydrate companyUser, so that's a
      // ~1 second tax we were paying on every tab switch and survey
      // type filter change. JWT-strategy sessions don't expire client-
      // side, so we can opt out of the focus refetch and the periodic
      // poll without losing correctness — the next genuine auth.update()
      // call still refreshes the token.
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      {children}
    </SessionProvider>
  );
}
