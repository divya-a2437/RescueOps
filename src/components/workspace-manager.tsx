"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Check, Copy, LoaderCircle, Plus, RefreshCw, Users, KeyRound, Building2 } from "lucide-react";

type Workspace = {
  organization_id: string;
  role: "owner" | "admin" | "member" | string;
  created_at: string;
  organizations: { id: string; name: string; slug: string } | null;
};

type Member = { user_id: string; role: string; created_at: string };

const inputClass = "w-full rounded-xl border border-[#dfe5dc] bg-white px-3.5 py-3 text-xs outline-none transition placeholder:text-[#a1a99e] focus:border-[#89a385]";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-[#214b31] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#173b25] disabled:cursor-not-allowed disabled:opacity-60";

export default function WorkspaceManager() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");
  const [invitationCode, setInvitationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const request = useCallback(async (body?: Record<string, string>) => {
    const response = await fetch("/api/organizations", {
      method: body ? "POST" : "GET",
      ...(body ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : { cache: "no-store" as RequestCache }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "The request could not be completed.");
    return result;
  }, []);

  const loadWorkspaces = useCallback(async (preferredId?: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await request();
      const list: Workspace[] = result.workspaces ?? [];
      setWorkspaces(list);
      setSelectedId((currentId) =>
        preferredId && list.some((item) => item.organization_id === preferredId)
          ? preferredId
          : currentId && list.some((item) => item.organization_id === currentId)
            ? currentId
            : list[0]?.organization_id ?? ""
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load workspaces.");
    } finally {
      setLoading(false);
    }
  }, [request]);

  const loadMembers = useCallback(async (organizationId: string) => {
    if (!organizationId) { setMembers([]); return; }
    try {
      const response = await fetch(`/api/organizations?organizationId=${encodeURIComponent(organizationId)}`, { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load members.");
      setMembers(result.members ?? []);
    } catch (err) {
      setMembers([]);
      setError(err instanceof Error ? err.message : "Unable to load workspace members.");
    }
  }, []);

  useEffect(() => { void loadWorkspaces(); }, [loadWorkspaces]);
  useEffect(() => { void loadMembers(selectedId); }, [loadMembers, selectedId]);

  async function submitAction(event: FormEvent<HTMLFormElement>, action: "create" | "join") {
    event.preventDefault();
    setBusy(true); setError(""); setNotice(""); setGeneratedCode("");
    try {
      const result = await request(action === "create"
        ? { action, name: workspaceName.trim() }
        : { action, invitationCode: invitationCode.trim() });
      if (action === "create") setWorkspaceName(""); else setInvitationCode("");
      setNotice(action === "create" ? "Workspace created successfully." : "You joined the workspace successfully.");
      await loadWorkspaces(result.organizationId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to complete the request.");
    } finally { setBusy(false); }
  }

  async function generateCode() {
    if (!selectedId) return;
    setBusy(true); setError(""); setNotice(""); setGeneratedCode("");
    try {
      const result = await request({ action: "create_invitation", organizationId: selectedId });
      setGeneratedCode(result.invitationCode);
      setNotice("Invitation code generated. Share it only with people who should access this workspace.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to generate an invitation code.");
    } finally { setBusy(false); }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch { setError("Clipboard access failed. Select and copy the invitation code manually."); }
  }

  const selected = workspaces.find((item) => item.organization_id === selectedId);
  const canInvite = selected?.role === "owner" || selected?.role === "admin";

  return (
    <div className="mx-auto max-w-[1200px]">
      <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-3 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#758373]"><span className="h-2 w-2 rounded-full bg-[#6b9664]" />Workspace administration</p>
          <h1 className="text-2xl font-semibold tracking-[-0.045em] sm:text-[32px]">Teams that work together.</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-[#7b8579]">Create a shared workspace or join your organisation with an invitation code. Members can collaborate on the same operational records.</p>
        </div>
        <button onClick={() => void loadWorkspaces()} disabled={loading} className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-[#e2e7df] bg-white px-3.5 py-2.5 text-xs font-medium text-[#4b5c4b] hover:bg-[#f5f7f2] disabled:opacity-50 sm:self-auto"><RefreshCw size={14} className={loading ? "animate-spin" : ""} />Refresh</button>
      </div>

      {(error || notice) && <div role={error ? "alert" : "status"} className={`mb-5 rounded-xl border p-3.5 text-xs leading-5 ${error ? "border-red-200 bg-red-50 text-red-700" : "border-[#dce8d7] bg-[#f1f7ee] text-[#315b3d]"}`}>{error || notice}</div>}

      <div className="grid gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-[#e3e8df] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e9f0e7] text-[#426b43]"><Building2 size={18} /></div><div><h2 className="text-sm font-semibold">Create a workspace</h2><p className="mt-1 text-[11px] text-[#879083]">Set up a shared space for your team.</p></div></div>
          <form onSubmit={(event) => void submitAction(event, "create")} className="flex flex-col gap-3 sm:flex-row">
            <input aria-label="Workspace name" className={inputClass} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} minLength={2} maxLength={80} required placeholder="e.g. North Zone Operations" />
            <button className={buttonClass} disabled={busy}><Plus size={15} />Create</button>
          </form>
        </section>

        <section className="rounded-2xl border border-[#e3e8df] bg-white p-5 sm:p-6">
          <div className="mb-5 flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4efdf] text-[#8a7745]"><KeyRound size={18} /></div><div><h2 className="text-sm font-semibold">Join a workspace</h2><p className="mt-1 text-[11px] text-[#879083]">Enter a code shared by a workspace owner.</p></div></div>
          <form onSubmit={(event) => void submitAction(event, "join")} className="flex flex-col gap-3 sm:flex-row">
            <input aria-label="Invitation code" className={inputClass} value={invitationCode} onChange={(event) => setInvitationCode(event.target.value)} required placeholder="Enter invitation code" autoCapitalize="characters" />
            <button className={buttonClass} disabled={busy}><Users size={15} />Join</button>
          </form>
        </section>
      </div>

      <section className="mt-5 rounded-2xl border border-[#e3e8df] bg-white p-5 sm:p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div><h2 className="text-sm font-semibold">Your workspaces</h2><p className="mt-1 text-[11px] leading-5 text-[#879083]">Manage invitations and review who has access.</p></div>
          {workspaces.length > 0 && <select aria-label="Select workspace" className={`${inputClass} sm:max-w-[300px]`} value={selectedId} onChange={(event) => { setSelectedId(event.target.value); setGeneratedCode(""); }}><option value="">Select a workspace</option>{workspaces.map((item) => <option key={item.organization_id} value={item.organization_id}>{item.organizations?.name ?? "Unnamed workspace"} · {item.role}</option>)}</select>}
        </div>

        {loading ? <div className="flex items-center gap-2 py-10 text-xs text-[#7b8579]"><LoaderCircle size={16} className="animate-spin" />Loading workspaces…</div> : workspaces.length === 0 ? <div className="mt-5 rounded-xl border border-dashed border-[#dfe5dc] bg-[#fafbf9] px-4 py-8 text-center"><p className="text-sm font-medium">No workspaces yet</p><p className="mt-1 text-xs text-[#879083]">Create one or join using an invitation code.</p></div> : selected && <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="rounded-xl border border-[#edf0ea] bg-[#fafbf9] p-4">
            <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{selected.organizations?.name ?? "Workspace"}</p><p className="mt-1 text-[10px] text-[#879083]">Your role: <span className="font-semibold capitalize text-[#46674a]">{selected.role}</span></p></div><span className="rounded-lg bg-[#e9f0e7] px-2.5 py-1 text-[10px] font-semibold text-[#426b43]">{members.length} {members.length === 1 ? "member" : "members"}</span></div>
            {canInvite ? <button onClick={() => void generateCode()} disabled={busy} className={`${buttonClass} mt-4 w-full`}><KeyRound size={14} />Generate invitation code</button> : <p className="mt-4 rounded-lg bg-white p-3 text-[11px] leading-5 text-[#879083]">Only workspace owners and admins can generate invitation codes.</p>}
            {generatedCode && <div className="mt-3 rounded-xl border border-[#dce8d7] bg-white p-3"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#758373]">Invitation code</p><div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all text-sm font-semibold tracking-wider text-[#284d31]">{generatedCode}</code><button onClick={() => void copyCode()} aria-label="Copy invitation code" className="rounded-lg border border-[#e3e8df] p-2 text-[#46674a] hover:bg-[#f5f7f2]">{copied ? <Check size={15} /> : <Copy size={15} />}</button></div><p className="mt-2 text-[10px] text-[#879083]">Anyone with this code may be able to join. Share it carefully.</p></div>}
          </div>
          <div><div className="mb-3 flex items-center gap-2"><Users size={15} className="text-[#65805e]"/><h3 className="text-xs font-semibold">Team members</h3></div>{members.length === 0 ? <p className="rounded-xl border border-dashed border-[#dfe5dc] p-5 text-xs text-[#879083]">No member details available yet.</p> : <ul className="divide-y divide-[#edf0ea] rounded-xl border border-[#edf0ea] px-3">{members.map((member) => <li key={member.user_id} className="flex items-center gap-3 py-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#e7eee3] text-[10px] font-semibold text-[#31583b]">{member.role.slice(0, 1).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="text-[11px] font-medium text-[#455344]">Member ID · {member.user_id.slice(0, 8)}</p><p className="mt-0.5 text-[10px] text-[#929a8d]">Joined {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(member.created_at))}</p></div><span className="rounded-md bg-[#f1f4ee] px-2 py-1 text-[10px] font-medium capitalize text-[#52664f]">{member.role}</span></li>)}</ul>}</div>
        </div>}
      </section>
    </div>
  );
}
