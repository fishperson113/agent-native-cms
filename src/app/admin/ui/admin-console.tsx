"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import styles from "../admin.module.css";

type Tenant = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "disabled";
  createdAt: string;
};
type Credential = {
  id: string;
  role: "admin" | "tenant";
  tenantId: string | null;
  name: string;
  note: string | null;
  keyPrefix: string;
  plaintextKey: string | null;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
};
type Article = {
  id: string;
  tenantId: string;
  tenantName: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  updatedAt: string;
};
type RuntimeSession = {
  sessionId: string;
  credentialId: string;
  tenantId: string;
  createdAt: string;
  lastActivityAt: string;
};
export type AdminSnapshot = {
  tenants: Tenant[];
  credentials: Credential[];
  articles: Article[];
  runtime: {
    activeSessions: number;
    database: "ready" | "unavailable";
    maxSessions: number;
    startedAt: string;
  };
  sessions: RuntimeSession[];
};

export function AdminConsole({ initialSnapshot, onLoggedOut }: { initialSnapshot: AdminSnapshot; onLoggedOut?: () => void }) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const activeKeys = useMemo(
    () => snapshot.credentials.filter((credential) => !credential.revokedAt),
    [snapshot.credentials],
  );

  async function refreshSnapshot() {
    const response = await fetch("/api/admin/snapshot", { cache: "no-store" });
    if (response.status === 401) {
      router.refresh();
      return;
    }
    if (!response.ok) throw new Error("Could not refresh the control plane.");
    setSnapshot((await response.json()) as AdminSnapshot);
  }

  async function mutate(key: string, action: () => Promise<Response>) {
    setPending(key);
    setError("");
    try {
      const response = await action();
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "The operation failed.");
      }
      await refreshSnapshot();
      setConfirming(null);
      return response;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The operation failed.");
      return null;
    } finally {
      setPending(null);
    }
  }

  async function createTenant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await mutate("create-tenant", () =>
      fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), slug: form.get("slug") }),
      }),
    );
    if (response) formElement.reset();
  }

  async function issueCredential(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const response = await mutate("issue-key", () =>
      fetch("/api/admin/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: form.get("tenantId"),
          name: form.get("name"),
          note: form.get("note") || undefined,
        }),
      }),
    );
    if (response) formElement.reset();
  }

  async function copyText(value: string, feedbackId: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(feedbackId);
    } catch {
      setError("Clipboard access failed. Copy the text manually instead.");
    }
  }

  function setupPrompt(plaintextKey: string) {
    const origin = window.location.origin;
    return `Configure this coding agent to connect to my Agent Native CMS.

Use a stateful Streamable HTTP MCP connection with these exact values:
- Server name: agent-native-cms
- URL: ${origin}/api/mcp
- Authorization header: Bearer ${plaintextKey}

Inspect this coding agent's own MCP configuration format and install the connection for me. Remove any older stdio or legacy Agent Native CMS configuration first so there is only one active connection.

This is a tenant credential. Never treat it as an admin key, never commit it to source control, and never expose it in browser code or application output.

After connecting, call cms_get_instructions and cms_get_presentation_sdk. Then list the current articles to verify that the tenant-scoped connection works. Report the MCP server URL, connection status, available cms_* tools, and any setup issue. Do not edit or redeploy the CMS kernel.`;
  }

  function downloadSetupPrompt(plaintextKey: string) {
    const content = setupPrompt(plaintextKey);
    const url = URL.createObjectURL(new Blob([content], { type: "text/plain" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "agent-native-cms-setup-prompt.txt";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/session", { method: "DELETE" });
    if (onLoggedOut) onLoggedOut();
    else router.refresh();
  }

  return (
    <>
      <header className={styles.topbar}>
        <div>
          <div className={styles.eyebrow}>AGENT NATIVE CMS / OPERATOR</div>
          <h1>Control plane</h1>
        </div>
        <div className={styles.topbarActions}>
          <Link href="/">View publication</Link>
          <button className={styles.quietButton} onClick={logout}>Sign out</button>
        </div>
      </header>

      {error ? (
        <div className={styles.globalError} role="alert">
          <span>{error}</span>
          <button onClick={() => setError("")}>Dismiss</button>
        </div>
      ) : null}

      <section className={styles.metrics} aria-label="Runtime overview">
        <Metric label="Database" value={snapshot.runtime.database} signal={snapshot.runtime.database === "ready"} />
        <Metric label="Active tenants" value={String(snapshot.tenants.filter((tenant) => tenant.status === "active").length)} />
        <Metric label="Active keys" value={String(activeKeys.length)} />
        <Metric label="MCP sessions" value={`${snapshot.runtime.activeSessions} / ${snapshot.runtime.maxSessions}`} />
      </section>

      <section className={styles.section} aria-labelledby="tenants-title">
        <SectionHeading index="01" title="Tenants" description="Create workspaces and stop all agent access for a tenant in one action." />
        <form className={styles.inlineForm} onSubmit={createTenant}>
          <label><span>Name</span><input name="name" required placeholder="Editorial lab" /></label>
          <label><span>Slug</span><input name="slug" required placeholder="editorial-lab" pattern="[a-z0-9-]+" /></label>
          <button disabled={pending === "create-tenant"}>{pending === "create-tenant" ? "Creating..." : "Create tenant"}</button>
        </form>
        <div className={styles.rows}>
          {snapshot.tenants.length === 0 ? <EmptyState text="No tenants yet." /> : snapshot.tenants.map((tenant) => (
            <article className={styles.row} key={tenant.id}>
              <div className={styles.rowMain}><strong>{tenant.name}</strong><code>{tenant.slug}</code></div>
              <Status value={tenant.status} />
              <button className={styles.quietButton} disabled={pending === tenant.id} onClick={() => void mutate(tenant.id, () => fetch(`/api/admin/tenants/${tenant.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: tenant.status === "active" ? "disabled" : "active" }) }))}>{pending === tenant.id ? "Updating..." : tenant.status === "active" ? "Disable" : "Enable"}</button>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="tenant-keys-title">
        <SectionHeading index="02" title="Tenant keys" description="Issue fixed keys, retrieve them later, and revoke access from one operator view." />
        <div className={styles.keyGuide}>
          <strong>
            How tenant access works
            <InfoTip text="Choose a tenant, name the integration, then issue one key. The key can only access that tenant through MCP." />
          </strong>
          <p>Issue a key once, then copy its key or pre-filled setup prompt whenever a tenant needs access.</p>
        </div>
        <form className={styles.keyForm} onSubmit={issueCredential}>
          <label><span>Tenant <InfoTip text="The coding agent will only see and modify content owned by this tenant." /></span><select name="tenantId" required defaultValue=""><option value="" disabled>Select tenant</option>{snapshot.tenants.filter((tenant) => tenant.status === "active").map((tenant) => <option key={tenant.id} value={tenant.id}>{tenant.name}</option>)}</select></label>
          <label><span>Key name <InfoTip text="Use a recognizable name such as Codex laptop or Claude publishing agent so you can revoke the right integration later." /></span><input name="name" required placeholder="Codex publishing agent" /></label>
          <label><span>Note <InfoTip text="Optional operator-only context. This is never included in the coding-agent setup prompt." /></span><input name="note" placeholder="Optional context" /></label>
          <button disabled={pending === "issue-key"}>{pending === "issue-key" ? "Issuing..." : "Issue tenant key"}</button>
        </form>
        <div className={styles.rows}>
          {snapshot.credentials.length === 0 ? <EmptyState text="No credentials yet." /> : snapshot.credentials.map((credential) => (
            <article className={styles.row} key={credential.id}>
              <div className={styles.rowMain}><strong>{credential.name}</strong><code>{credential.plaintextKey ?? `${credential.keyPrefix}...`}</code><small>{credential.role === "admin" ? "Operator REST only" : snapshot.tenants.find((tenant) => tenant.id === credential.tenantId)?.name ?? "Unknown tenant"}</small></div>
              <Status value={credential.revokedAt ? "revoked" : credential.role} />
              <div className={styles.rowActions}>
                {!credential.revokedAt && credential.role === "tenant" ? (
                  <div className={styles.promptAction}>
                    <button
                      type="button"
                      className={`${styles.quietButton} ${styles.promptButton}`}
                      disabled={!credential.plaintextKey}
                      onClick={() => {
                        if (!credential.plaintextKey) return;
                        void copyText(credential.plaintextKey, `key:${credential.id}`);
                      }}
                    >
                      {credential.plaintextKey
                        ? copied === `key:${credential.id}` ? "Key copied" : "Copy key"
                        : "Key unavailable"}
                    </button>
                    <button
                      type="button"
                      className={`${styles.quietButton} ${styles.promptButton}`}
                      disabled={!credential.plaintextKey}
                      onClick={() => {
                        if (!credential.plaintextKey) return;
                        void copyText(setupPrompt(credential.plaintextKey), `prompt:${credential.id}`);
                      }}
                    >
                      {credential.plaintextKey
                        ? copied === `prompt:${credential.id}` ? "Prompt copied" : "Copy setup prompt"
                        : "Prompt unavailable"}
                    </button>
                    {credential.plaintextKey ? <button type="button" className={styles.quietButton} onClick={() => downloadSetupPrompt(credential.plaintextKey!)}>Download prompt</button> : null}
                    <InfoTip text={credential.plaintextKey ? "Copies a complete MCP setup prompt with this tenant key already filled in. The key remains available after refresh." : "This key was created before recoverable tenant keys were enabled. Issue a replacement key once, then revoke this legacy key."} />
                  </div>
                ) : null}
                {!credential.revokedAt ? <ConfirmAction id={`credential:${credential.id}`} label="Revoke" confirming={confirming} setConfirming={setConfirming} pending={pending} onConfirm={() => void mutate(`credential:${credential.id}`, () => fetch(`/api/admin/credentials/${credential.id}`, { method: "DELETE" }))} /> : <span className={styles.muted}>Revoked</span>}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="articles-title">
        <SectionHeading index="03" title="Articles" description="Moderate content across tenants. Deletion also removes its owned presentation history." />
        <div className={styles.rows}>
          {snapshot.articles.length === 0 ? <EmptyState text="No articles across current tenants." /> : snapshot.articles.map((article) => (
            <article className={styles.row} key={article.id}>
              <div className={styles.rowMain}><strong>{article.title}</strong><code>/{article.slug}</code><small>{article.tenantName}</small></div>
              <Status value={article.status} />
              <ConfirmAction id={`article:${article.id}`} label="Delete" confirming={confirming} setConfirming={setConfirming} pending={pending} onConfirm={() => void mutate(`article:${article.id}`, () => fetch(`/api/admin/articles/${article.tenantId}/${article.id}`, { method: "DELETE" }))} />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="runtime-title">
        <SectionHeading index="04" title="MCP runtime" description="Inspect current tenant sessions and close a connection without restarting the kernel." />
        <div className={styles.rows}>
          {snapshot.sessions.length === 0 ? <EmptyState text="No active MCP sessions." /> : snapshot.sessions.map((session) => (
            <article className={styles.row} key={session.sessionId}>
              <div className={styles.rowMain}><strong>{snapshot.tenants.find((tenant) => tenant.id === session.tenantId)?.name ?? "Unknown tenant"}</strong><code>{session.sessionId}</code><small>Last activity {formatDate(session.lastActivityAt)}</small></div>
              <Status value="connected" />
              <button className={styles.quietButton} disabled={pending === `session:${session.sessionId}`} onClick={() => void mutate(`session:${session.sessionId}`, () => fetch(`/api/admin/runtime/sessions/${session.sessionId}`, { method: "DELETE" }))}>Close session</button>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

function Metric({ label, value, signal = false }: { label: string; value: string; signal?: boolean }) { return <div className={styles.metric}><span>{label}</span><strong className={signal ? styles.signal : undefined}>{value}</strong></div>; }
function SectionHeading({ index, title, description }: { index: string; title: string; description: string }) { return <div className={styles.sectionHeading}><span>{index}</span><div><h2 id={`${title.toLowerCase().replaceAll(" ", "-")}-title`}>{title}</h2><p>{description}</p></div></div>; }
function Status({ value }: { value: string }) { return <span className={styles.status} data-state={value}>{value}</span>; }
function EmptyState({ text }: { text: string }) { return <div className={styles.empty}>{text}</div>; }
function InfoTip({ text }: { text: string }) { return <span className={styles.infoTip} tabIndex={0} aria-label={text}>?<span role="tooltip">{text}</span></span>; }
function ConfirmAction({ id, label, confirming, setConfirming, pending, onConfirm }: { id: string; label: string; confirming: string | null; setConfirming: (value: string | null) => void; pending: string | null; onConfirm: () => void }) { return confirming === id ? <div className={styles.confirm}><span>Are you sure?</span><button className={styles.dangerButton} disabled={pending === id} onClick={onConfirm}>{pending === id ? "Working..." : `Confirm ${label.toLowerCase()}`}</button><button className={styles.quietButton} onClick={() => setConfirming(null)}>Cancel</button></div> : <button className={styles.quietButton} onClick={() => setConfirming(id)}>{label}</button>; }
function formatDate(value: string) { return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
