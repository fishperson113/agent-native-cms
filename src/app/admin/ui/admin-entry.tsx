"use client";

import { useEffect, useState } from "react";

import { AdminConsole, type AdminSnapshot } from "./admin-console";
import { AdminLogin } from "./admin-login";
import styles from "../admin.module.css";

type EntryState =
  | { status: "loading" }
  | { status: "anonymous" }
  | { status: "authenticated"; snapshot: AdminSnapshot }
  | { status: "error"; message: string };

export function AdminEntry() {
  const [state, setState] = useState<EntryState>({ status: "loading" });

  async function resolveSession() {
    const session = await fetch("/api/admin/session", { cache: "no-store" });
    if (session.status === 401) {
      setState({ status: "anonymous" });
      return;
    }
    if (!session.ok) {
      setState({ status: "error", message: "Could not verify the operator session." });
      return;
    }
    const snapshot = await fetch("/api/admin/snapshot", { cache: "no-store" });
    if (!snapshot.ok) {
      setState({ status: "error", message: "Could not load the control plane." });
      return;
    }
    setState({ status: "authenticated", snapshot: (await snapshot.json()) as AdminSnapshot });
  }

  async function retry() {
    setState({ status: "loading" });
    await resolveSession();
  }

  useEffect(() => {
    void Promise.resolve().then(resolveSession);
  }, []);

  if (state.status === "loading") {
    return <div className={styles.entryLoading}><span>AGENT NATIVE CMS / OPERATOR</span><strong>Loading control plane...</strong></div>;
  }
  if (state.status === "error") {
    return <div className={styles.entryLoading}><strong>{state.message}</strong><button onClick={() => void retry()}>Try again</button></div>;
  }
  if (state.status === "anonymous") {
    return <AdminLogin onAuthenticated={() => void retry()} />;
  }
  return <AdminConsole initialSnapshot={state.snapshot} onLoggedOut={() => setState({ status: "anonymous" })} />;
}
