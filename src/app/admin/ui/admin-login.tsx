"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "../admin.module.css";

export function AdminLogin({ onAuthenticated }: { onAuthenticated?: () => void }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: form.get("key") }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      setError(body?.error ?? "Sign in failed.");
      setPending(false);
      return;
    }
    if (onAuthenticated) onAuthenticated();
    else router.refresh();
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginPanel} aria-labelledby="admin-login-title">
        <div className={styles.eyebrow}>AGENT NATIVE CMS / OPERATOR</div>
        <h1 id="admin-login-title">The human control plane.</h1>
        <p>
          Admin access stays here. Coding agents connect with tenant keys through
          MCP and never receive this credential.
        </p>
        <form onSubmit={submit} className={styles.loginForm}>
          <label htmlFor="admin-key">Admin key</label>
          <input
            id="admin-key"
            name="key"
            type="password"
            required
            minLength={16}
            autoComplete="current-password"
            placeholder="cms_admin_..."
          />
          {error ? <div className={styles.errorMessage}>{error}</div> : null}
          <button type="submit" disabled={pending}>
            {pending ? "Verifying..." : "Enter operator console"}
          </button>
        </form>
        <p className={styles.securityNote}>
          Your key is exchanged for an eight-hour secure session. It is not kept
          in browser storage.
        </p>
      </section>
    </main>
  );
}
