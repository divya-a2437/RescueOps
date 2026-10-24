
"use client";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import IncidentEvidence from "@/components/incident-evidence";
import { useRouter } from "next/navigation";
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Command,
  Download,
  FileSearch,
  Filter,
  Leaf,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Upload,
  X,
  LoaderCircle,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

type Severity = "low" | "medium" | "high";
type IncidentStatus = "investigating" | "under_review" | "resolved";
type IncidentCategory =
  | "missed_pickup"
  | "late_collection"
  | "quantity_mismatch"
  | "quality_concern"
  | "other";

type Incident = {
  id: string;
  incident_code: string;
  title: string;
  description: string;
  location: string;
  category: IncidentCategory;
  severity: Severity;
  status: IncidentStatus;
  occurred_at: string;
};



const navigation = [
  { label: "Overview", icon: Activity },
  { label: "Incidents", icon: FileSearch },
  { label: "Evidence", icon: ShieldCheck },
  { label: "Interventions", icon: TrendingUp },
];

const categoryLabels: Record<IncidentCategory, string> = {
  missed_pickup: "Missed pickup",
  late_collection: "Late collection",
  quantity_mismatch: "Quantity mismatch",
  quality_concern: "Quality concern",
  other: "Other",
};

const statusLabels: Record<IncidentStatus, string> = {
  investigating: "Investigating",
  under_review: "Under review",
  resolved: "Resolved",
};

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(date));
}

function getSeverityClasses(severity: Severity) {
  switch (severity) {
    case "high":
      return "border-red-200 bg-red-50 text-red-700";
    case "medium":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "low":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
}

function getStatusClasses(status: IncidentStatus) {
  switch (status) {
    case "investigating":
      return "bg-[#e9f0e9] text-[#315b3d]";
    case "under_review":
      return "bg-amber-50 text-amber-700";
    case "resolved":
      return "bg-slate-100 text-slate-600";
  }
}

export default function DashboardPage() {
  const router = useRouter();

  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isLoadingIncidents, setIsLoadingIncidents] = useState(true);
  const [incidentsLoading, setIncidentsLoading] = useState(true);
  const [incidentsError, setIncidentsError] = useState("");
  const [creatingIncident, setCreatingIncident] = useState(false);
  const [activeNav, setActiveNav] = useState("Overview");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [showNewIncident, setShowNewIncident] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState("");
  const [formError, setFormError] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null
  );

  const [newIncident, setNewIncident] = useState({
    title: "",
    location: "",
    description: "",
    category: "missed_pickup" as IncidentCategory,
    severity: "medium" as Severity,
  });
  
  useEffect(() => {
    let cancelled = false;

    async function loadIncidents() {
      setIncidentsLoading(true);
      setIncidentsError("");

      try {
        const response = await fetch("/api/incidents", {
          method: "GET",
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Unable to load incidents.");
        }

        if (!cancelled) {
          setIncidents(
            result.incidents.map((item: Incident) => ({
              ...item,
              description: item.description ?? "",
              location: item.location ?? "",
            }))
          );
        }
      } catch (error) {
        if (!cancelled) {
          setIncidentsError(
            error instanceof Error
              ? error.message
              : "Unable to load incidents."
          );
        }
      } finally {
        if (!cancelled) {
          setIncidentsLoading(false);
        }
      }
    }

    loadIncidents();

    return () => {
      cancelled = true;
    };
  }, []);


  const filteredIncidents = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return incidents.filter((incident) => {
      const matchesFilter =
        filter === "all" || incident.status === filter;

      const matchesSearch =
        !normalizedSearch ||
        [
          incident.incident_code,
          incident.title,
          incident.location,
          incident.description,
          categoryLabels[incident.category],
        ].some((value) => value.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });
  }, [incidents, filter, search]);

  const openIncidents = incidents.filter(
    (incident) => incident.status !== "resolved"
  ).length;

  const highSeverityIncidents = incidents.filter(
    (incident) =>
      incident.severity === "high" && incident.status !== "resolved"
  ).length;

  const resolvedIncidents = incidents.filter(
    (incident) => incident.status === "resolved"
  ).length;

const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    setCurrentDate(
      new Intl.DateTimeFormat("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date())
    );
  }, []);

  async function handleSignOut() {
    if (signingOut) return;

    setSigningOut(true);
    setSignOutError("");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        setSignOutError(error.message);
        setSigningOut(false);
        return;
      }

      router.replace("/login");
      router.refresh();
    } catch {
      setSignOutError("Unable to sign out. Please try again.");
      setSigningOut(false);
    }
  }

  
  async function handleCreateIncident(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setFormError("");

  const title = newIncident.title.trim();
  const location = newIncident.location.trim();
  const description = newIncident.description.trim();

  if (title.length < 3) {
    setFormError("Enter an incident title with at least 3 characters.");
    return;
  }

  if (!location) {
    setFormError("Enter the incident location.");
    return;
  }

  setCreatingIncident(true);

  try {
    const response = await fetch("/api/incidents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        location,
        description,
        category: newIncident.category,
        severity: newIncident.severity,
        occurred_at: new Date().toISOString(),
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(
        result.error || "Unable to save the incident."
      );
    }

    const savedIncident: Incident = {
      ...result.incident,
      description: result.incident.description ?? "",
      location: result.incident.location ?? "",
    };

    setIncidents((current) => [
      savedIncident,
      ...current.filter((item) => item.id !== savedIncident.id),
    ]);

    setFilter("all");
    setSearch("");
    setNewIncident({
      title: "",
      location: "",
      description: "",
      category: "missed_pickup",
      severity: "medium",
    });
    setShowNewIncident(false);
  } catch (error) {
    setFormError(
      error instanceof Error
        ? error.message
        : "Unable to save the incident."
    );
  } finally {
    setCreatingIncident(false);
  }
  }


  function handleNavigation(label: string) {
    setActiveNav(label);
    setMobileMenu(false);

    if (label === "Incidents") {
      document.getElementById("incidents-table")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f5] text-[#202b24]">
      <div className="flex min-h-screen">
        {mobileMenu && (
          <button
            aria-label="Close navigation menu"
            className="fixed inset-0 z-30 bg-black/30 lg:hidden"
            onClick={() => setMobileMenu(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col border-r border-[#e5e9e1] bg-white transition-transform duration-200 lg:static lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-[76px] items-center gap-3 border-b border-[#edf0ea] px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1d4930] text-white">
              <Leaf size={21} />
            </div>
            <div>
              <p className="text-[17px] font-semibold tracking-tight">
                RescueOps
              </p>
              <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.17em] text-[#829080]">
                Operations intelligence
              </p>
            </div>
            <button
              onClick={() => setMobileMenu(false)}
              aria-label="Close menu"
              className="ml-auto rounded-lg p-1.5 text-[#748073] hover:bg-[#f4f6f1] lg:hidden"
            >
              <X size={18} />
            </button>
          </div>

          <div className="px-4 pt-7">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#99a197]">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => handleNavigation(label)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium transition ${
                    activeNav === label
                      ? "bg-[#eaf0e8] text-[#234b30]"
                      : "text-[#687368] hover:bg-[#f6f7f4] hover:text-[#25382a]"
                  }`}
                >
                  <Icon size={17} strokeWidth={1.8} />
                  <span>{label}</span>
                  {label === "Incidents" && openIncidents > 0 && (
                    <span className="ml-auto rounded-md bg-white px-2 py-0.5 text-[10px] font-semibold text-[#506b51]">
                      {openIncidents}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mx-6 my-6 border-t border-[#edf0ea]" />

          <div className="px-4">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.17em] text-[#99a197]">
              Intelligence
            </p>
            <div className="rounded-2xl border border-[#e4e9df] bg-[#f8faf6] p-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#e3ecdf] text-[#315a3a]">
                  <Sparkles size={14} />
                </div>
                <p className="text-xs font-semibold">Investigation assistant</p>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-[#788376]">
                Turn incident evidence into structured findings and actionable
                next steps.
              </p>
              <div className="mt-3 flex items-center gap-1.5 text-[10px] font-medium text-[#46674a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#6d9b67]" />
                Workspace preview
              </div>
            </div>
          </div>

          <div className="mt-auto border-t border-[#edf0ea] p-4">
            <div className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e7eee3] text-xs font-semibold text-[#31583b]">
                RO
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold">RescueOps team</p>
                <p className="mt-0.5 truncate text-[10px] text-[#899187]">
                  Operations workspace
                </p>
              </div>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                title="Sign out"
                aria-label="Sign out"
                className="rounded-lg p-2 text-[#7b8679] transition hover:bg-[#f1f4ee] hover:text-[#284d31] disabled:opacity-50"
              >
                {signingOut ? (
                  <LoaderCircle size={16} className="animate-spin" />
                ) : (
                  <LogOut size={16} />
                )}
              </button>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#e5e9e1] bg-white/95 px-4 backdrop-blur sm:px-7 lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              <button
                aria-label="Open navigation menu"
                onClick={() => setMobileMenu(true)}
                className="rounded-lg p-2 text-[#617060] hover:bg-[#f3f5f0] lg:hidden"
              >
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[11px] text-[#899187]">
                  <span>Workspace</span>
                  <ChevronRight size={12} />
                  <span className="truncate text-[#4e5c4e]">{activeNav}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold">
                  {activeNav === "Overview"
                    ? "Operations overview"
                    : activeNav}
                </p>
              </div>
            </div>

            <div className="ml-3 flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-lg border border-[#e6eae3] bg-[#fafbf9] px-3 py-2 text-[11px] text-[#7c8779] md:flex">
                <Command size={13} />
                <span>RescueOps workspace</span>
              </div>
              <button
                aria-label="Notifications"
                title="Notifications"
                className="relative rounded-xl border border-[#e7ebe4] p-2.5 text-[#687468] transition hover:bg-[#f7f8f5]"
              >
                <Bell size={17} />
                {highSeverityIncidents > 0 && (
                  <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#c96b4e]" />
                )}
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="inline-flex items-center gap-2 rounded-xl border border-[#e2e7df] px-3 py-2.5 text-xs font-medium text-[#4b5c4b] transition hover:bg-[#f5f7f2] disabled:opacity-50"
              >
                {signingOut ? (
                  <LoaderCircle size={15} className="animate-spin" />
                ) : (
                  <LogOut size={15} />
                )}
                <span className="hidden sm:inline">
                  {signingOut ? "Signing out..." : "Sign out"}
                </span>
              </button>
            </div>
          </header>

          <div className="mx-auto max-w-[1600px] px-4 py-7 sm:px-7 sm:py-9 lg:px-10">
            {signOutError && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Could not sign out</p>
                  <p className="mt-1 break-words text-xs">{signOutError}</p>
                </div>
                <button
                  aria-label="Dismiss error"
                  onClick={() => setSignOutError("")}
                  className="rounded-md p-1 hover:bg-red-100"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#6b9664]" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#758373]">
                    Live workspace preview
                  </p>
                </div>
                <h1 className="text-2xl font-semibold tracking-[-0.045em] sm:text-[32px]">
                  Good morning, team.
                </h1>
                <p className="mt-2 max-w-xl text-[13px] leading-6 text-[#7b8579]">
                  Monitor food rescue operations, investigate exceptions, and
                  keep every action tied to evidence.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    setFormError("");
                    setShowNewIncident(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#214b31] px-4 py-3 text-xs font-semibold text-white shadow-sm transition hover:bg-[#173b25]"
                >
                  <Plus size={16} />
                  Log an incident
                </button>
              </div>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-b border-[#e5e9e1] pb-4">
              <div className="flex items-center gap-2 text-[11px] text-[#818b7e]">
                <Clock3 size={14} />
                <span>{currentDate}</span>
                <span className="text-[#c0c7bd]">/</span>
                <span>Operational snapshot</span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard
                label="Open incidents"
                value={String(openIncidents).padStart(2, "0")}
                detail="Require follow-up"
                icon={Activity}
                iconClass="bg-[#e9f0e7] text-[#426b43]"
                trend="Active queue"
              />
              <MetricCard
                label="High severity"
                value={String(highSeverityIncidents).padStart(2, "0")}
                detail="Need priority review"
                icon={AlertCircle}
                iconClass="bg-[#faeae5] text-[#b65c43]"
                trend="Priority"
              />
              <MetricCard
                label="Resolved"
                value={String(resolvedIncidents).padStart(2, "0")}
                detail="Marked as resolved"
                icon={Check}
                iconClass="bg-[#e8eef5] text-[#55769a]"
                trend="Completed"
              />
              <MetricCard
                label="Total recorded"
                value={String(incidents.length).padStart(2, "0")}
                detail="Incidents in this view"
                icon={FileSearch}
                iconClass="bg-[#f4efdf] text-[#8a7745]"
                trend="All records"
              />
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
              <section
                id="incidents-table"
                className="min-w-0 overflow-hidden rounded-2xl border border-[#e3e8df] bg-white"
              >
                <div className="flex flex-col gap-4 border-b border-[#edf0ea] px-5 py-5 sm:px-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[15px] font-semibold tracking-tight">
                        Incident register
                      </p>
                      <p className="mt-1 text-[11px] leading-5 text-[#879083]">
                        A traceable view of reported operational exceptions.
                      </p>
                    </div>
                    <button
                      aria-label="More incident options"
                      title="More options"
                      className="rounded-lg p-2 text-[#8a9387] hover:bg-[#f5f7f2]"
                    >
                      <MoreHorizontal size={18} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <Search
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98a095]"
                      />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search incidents, locations..."
                        aria-label="Search incidents"
                        className="w-full rounded-xl border border-[#e4e9e1] bg-[#fcfdfa] py-2.5 pl-9 pr-3 text-xs outline-none transition placeholder:text-[#a0a89d] focus:border-[#9ab398]"
                      />
                    </div>
                    <div className="relative">
                      <SlidersHorizontal
                        size={14}
                        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7b8779]"
                      />
                      <select
                        aria-label="Filter by incident status"
                        value={filter}
                        onChange={(event) => setFilter(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-[#e4e9e1] bg-white py-2.5 pl-9 pr-9 text-xs text-[#586556] outline-none focus:border-[#9ab398] sm:w-auto"
                      >
                        <option value="all">All statuses</option>
                        <option value="investigating">Investigating</option>
                        <option value="under_review">Under review</option>
                        <option value="resolved">Resolved</option>
                      </select>
                      <ChevronDown
                        size={13}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#8b9588]"
                      />
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px] border-collapse text-left">
                    <thead>
                      <tr className="border-b border-[#edf0ea] bg-[#fafbf9]">
                        <th className="px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#899386] sm:px-6">
                          Incident
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#899386]">
                          Severity
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#899386]">
                          Status
                        </th>
                        <th className="px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.11em] text-[#899386]">
                          Reported
                        </th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredIncidents.map((incident) => (
                        <tr
                          key={incident.id}
                          className="border-b border-[#f0f2ed] transition last:border-0 hover:bg-[#fbfcf9]"
                        >
                          <td className="px-5 py-4 sm:px-6">
                            <button
                              onClick={() => setSelectedIncident(incident)}
                              className="block max-w-[300px] text-left"
                            >
                              <span className="block text-[12px] font-semibold text-[#344335] hover:text-[#527b50]">
                                {incident.title}
                              </span>
                              <span className="mt-1.5 block text-[10px] text-[#8b9488]">
                                {incident.incident_code}
                                <span className="mx-1.5 text-[#c7cec3]">
                                  ·
                                </span>
                                {incident.location}
                              </span>
                            </button>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-md border px-2 py-1 text-[10px] font-medium ${getSeverityClasses(
                                incident.severity
                              )}`}
                            >
                              {incident.severity.charAt(0).toUpperCase() +
                                incident.severity.slice(1)}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-md px-2 py-1 text-[10px] font-medium ${getStatusClasses(
                                incident.status
                              )}`}
                            >
                              {statusLabels[incident.status]}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4">
                            <p className="text-[11px] text-[#5d6b5b]">
                              {formatDate(incident.occurred_at)}
                            </p>
                            <p className="mt-1 text-[10px] text-[#9aa196]">
                              {formatTime(incident.occurred_at)}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <button
                              aria-label={`View ${incident.incident_code}`}
                              onClick={() => setSelectedIncident(incident)}
                              className="rounded-lg p-1.5 text-[#96a091] transition hover:bg-[#edf2e9] hover:text-[#36583b]"
                            >
                              <ArrowRight size={15} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredIncidents.length === 0 && (
                    <div className="px-5 py-12 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0f3ed] text-[#74846f]">
                        <Search size={18} />
                      </div>
                      <p className="mt-3 text-sm font-medium">
                        No incidents found
                      </p>
                      <p className="mt-1 text-xs text-[#899386]">
                        Try a different search term or status filter.
                      </p>
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilter("all");
                        }}
                        className="mt-3 text-xs font-semibold text-[#406744] hover:underline"
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between border-t border-[#edf0ea] px-5 py-3.5 sm:px-6">
                  <p className="text-[10px] text-[#929b8d]">
                    Showing {filteredIncidents.length} of {incidents.length}{" "}
                    records
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      disabled
                      aria-label="Previous page"
                      className="rounded-lg border border-[#e7ebe4] p-1.5 text-[#b1b9ae] disabled:opacity-50"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <span className="px-2 text-[10px] text-[#687567]">
                      1 / 1
                    </span>
                    <button
                      disabled
                      aria-label="Next page"
                      className="rounded-lg border border-[#e7ebe4] p-1.5 text-[#b1b9ae] disabled:opacity-50"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </section>

              <div className="flex min-w-0 flex-col gap-5">
                <section className="rounded-2xl border border-[#e3e8df] bg-white p-5 sm:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#edf2e9] text-[#416846]">
                          <TrendingUp size={16} />
                        </div>
                        <p className="text-[14px] font-semibold tracking-tight">
                          Pattern watch
                        </p>
                      </div>
                      <p className="mt-2 text-[11px] leading-5 text-[#879083]">
                        Areas to review across the current incident sample.
                      </p>
                    </div>
                    <span className="rounded-md border border-[#e6eae2] px-2 py-1 text-[9px] font-medium text-[#7d8979]">
                      Your Data
                    </span>
                  </div>

                  <div className="mt-5 space-y-4">
                    <PatternRow
                      icon={Clock3}
                      title="Collection reliability"
                      description="Review missed and late pickups."
                      value={incidents.filter(
                        (incident) =>
                          incident.category === "missed_pickup" ||
                          incident.category === "late_collection"
                      ).length}
                      iconClass="bg-[#f5eee0] text-[#9a7b3c]"
                    />
                    <PatternRow
                      icon={AlertCircle}
                      title="Quality exceptions"
                      description="Verify reports before closing."
                      value={incidents.filter(
                        (incident) =>
                          incident.category === "quality_concern"
                      ).length}
                      iconClass="bg-[#faeae5] text-[#b75f46]"
                    />
                    <PatternRow
                      icon={ShieldCheck}
                      title="Resolved records"
                      description="Marked resolved in this sample."
                      value={resolvedIncidents}
                      iconClass="bg-[#e8f0e7] text-[#4b7449]"
                    />
                  </div>

                  <p className="mt-5 border-t border-[#edf0ea] pt-4 text-[10px] leading-5 text-[#9aa294]">
                    These counts describe the displayed records, given by the user.
                  </p>
                </section>

                <section className="relative overflow-hidden rounded-2xl border border-[#294e34] bg-[#21472e] p-5 text-white sm:p-6">
                  <div className="pointer-events-none absolute -right-7 -top-8 h-36 w-36 rounded-full border border-white/10" />
                  <div className="pointer-events-none absolute -right-1 -top-2 h-24 w-24 rounded-full border border-white/10" />

                  <div className="relative">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 text-[#d7e6cf]">
                        <Sparkles size={16} />
                      </div>
                      <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#c5d6bd]">
                        Investigation workflow
                      </span>
                    </div>

                    <h2 className="mt-5 text-[19px] font-semibold leading-7 tracking-tight">
                      From exception to evidence-backed action.
                    </h2>
                    <p className="mt-2 text-[11px] leading-5 text-[#d0ddcc]">
                      Keep the report, supporting evidence, and follow-up
                      decisions connected throughout an investigation.
                    </p>

                    <div className="mt-5 space-y-3">
                      {[
                        "Record the incident",
                        "Attach supporting evidence",
                        "Document the next action",
                      ].map((step, index) => (
                        <div key={step} className="flex items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-[10px] font-medium text-[#dce8d7]">
                            {index + 1}
                          </span>
                          <span className="text-[11px] text-[#e1e9dd]">
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        setFormError("");
                        setShowNewIncident(true);
                      }}
                      className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#f4f6ef] px-4 py-2.5 text-[11px] font-semibold text-[#264a30] transition hover:bg-white"
                    >
                      Start an investigation
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </section>

                <section className="rounded-2xl border border-[#e3e8df] bg-white p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f1f0e8] text-[#8c7b4e]">
                      <ShieldCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">Evidence-first records</p>
                      <p className="mt-1 text-[10px] text-[#899386]">
                        A recommended operating principle
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-[11px] leading-5 text-[#7c8779]">
                    Capture what happened, when it happened, and what supports
                    the finding before closing an incident.
                  </p>
                </section>
              </div>
            </div>

            <footer className="mt-8 flex flex-col gap-2 border-t border-[#e5e9e1] pt-5 text-[10px] text-[#98a093] sm:flex-row sm:items-center sm:justify-between">
              <p>RescueOps · Food rescue operations intelligence</p>
              <p>Prototype workspace </p>
            </footer>
          </div>
        </section>
      </div>

      {showNewIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#15251a]/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowNewIncident(false);
              setFormError("");
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-incident-title"
            className="my-auto w-full max-w-xl rounded-2xl border border-[#e4e9e0] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#edf0ea] px-5 py-5 sm:px-7">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#668065]">
                  <Plus size={13} />
                  Incident register
                </div>
                <h2
                  id="new-incident-title"
                  className="mt-2 text-xl font-semibold tracking-tight"
                >
                  Log an incident
                </h2>
                <p className="mt-1 text-xs leading-5 text-[#879083]">
                  Capture the details needed to begin an investigation.
                </p>
              </div>
              <button
                aria-label="Close incident form"
                onClick={() => {
                  setShowNewIncident(false);
                  setFormError("");
                }}
                className="rounded-lg p-2 text-[#849080] transition hover:bg-[#f3f5f0]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-5 p-5 sm:p-7">
              <div>
                <label
                  htmlFor="incident-title"
                  className="mb-2 block text-xs font-semibold text-[#435043]"
                >
                  Incident title <span className="text-red-600">*</span>
                </label>
                <input
                  id="incident-title"
                  required
                  minLength={3}
                  maxLength={160}
                  value={newIncident.title}
                  onChange={(event) =>
                    setNewIncident((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="e.g. Pickup missed after confirmation"
                  className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-xs outline-none transition placeholder:text-[#a1a99e] focus:border-[#89a385]"
                />
              </div>

              <div>
                <label
                  htmlFor="incident-location"
                  className="mb-2 block text-xs font-semibold text-[#435043]"
                >
                  Location <span className="text-red-600">*</span>
                </label>
                <input
                  id="incident-location"
                  required
                  maxLength={200}
                  value={newIncident.location}
                  onChange={(event) =>
                    setNewIncident((current) => ({
                      ...current,
                      location: event.target.value,
                    }))
                  }
                  placeholder="Enter collection point or partner location"
                  className="w-full rounded-xl border border-[#dfe5dc] px-4 py-3 text-xs outline-none transition placeholder:text-[#a1a99e] focus:border-[#89a385]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="incident-category"
                    className="mb-2 block text-xs font-semibold text-[#435043]"
                  >
                    Category
                  </label>
                  <select
                    id="incident-category"
                    value={newIncident.category}
                    onChange={(event) =>
                      setNewIncident((current) => ({
                        ...current,
                        category: event.target.value as IncidentCategory,
                      }))
                    }
                    className="w-full rounded-xl border border-[#dfe5dc] bg-white px-3 py-3 text-xs outline-none focus:border-[#89a385]"
                  >
                    {Object.entries(categoryLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="incident-severity"
                    className="mb-2 block text-xs font-semibold text-[#435043]"
                  >
                    Severity
                  </label>
                  <select
                    id="incident-severity"
                    value={newIncident.severity}
                    onChange={(event) =>
                      setNewIncident((current) => ({
                        ...current,
                        severity: event.target.value as Severity,
                      }))
                    }
                    className="w-full rounded-xl border border-[#dfe5dc] bg-white px-3 py-3 text-xs outline-none focus:border-[#89a385]"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="incident-description"
                  className="mb-2 block text-xs font-semibold text-[#435043]"
                >
                  Description
                </label>
                <textarea
                  id="incident-description"
                  maxLength={2000}
                  rows={4}
                  value={newIncident.description}
                  onChange={(event) =>
                    setNewIncident((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe what happened and what needs to be checked..."
                  className="w-full resize-y rounded-xl border border-[#dfe5dc] px-4 py-3 text-xs leading-5 outline-none transition placeholder:text-[#a1a99e] focus:border-[#89a385]"
                />
              </div>

              <div className="flex items-start gap-2 rounded-xl border border-[#e5e9e1] bg-[#f8faf6] p-3">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#557650]" />
                <p className="text-[10px] leading-5 text-[#778274]">
                  This incident will be saved to your authenticated RescueOps workspace.
                </p>
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700"
                >
                  {formError}
                </p>
              )}

              <div className="flex flex-col-reverse gap-2 border-t border-[#edf0ea] pt-4 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewIncident(false);
                    setFormError("");
                  }}
                  className="rounded-xl border border-[#e1e6de] px-4 py-3 text-xs font-semibold text-[#657161] transition hover:bg-[#f6f7f3]"
                >
                  Cancel
                </button>
                
    <button
      type="submit"
      disabled={creatingIncident}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#214b31] px-5 py-3 text-xs font-semibold text-white transition hover:bg-[#173b25] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {creatingIncident ? (
        <>
          <LoaderCircle size={15} className="animate-spin" />
          Saving incident...
        </>
      ) : (
        <>
          <Plus size={15} />
          Create incident
        </>
      )}
    </button>

              </div>
            </form>
          </section>
        </div>
      )}

      {selectedIncident && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#15251a]/45 p-4 backdrop-blur-[3px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedIncident(null);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="incident-detail-title"
            className="my-auto w-full max-w-lg rounded-2xl border border-[#e4e9e0] bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-[#edf0ea] px-5 py-5 sm:px-6">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#7b8976]">
                  {selectedIncident.incident_code}
                </p>
                <h2
                  id="incident-detail-title"
                  className="mt-2 text-lg font-semibold tracking-tight"
                >
                  {selectedIncident.title}
                </h2>
              </div>
              <button
                aria-label="Close incident details"
                onClick={() => setSelectedIncident(null)}
                className="rounded-lg p-2 text-[#849080] hover:bg-[#f3f5f0]"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-5 p-5 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-md border px-2.5 py-1.5 text-[10px] font-medium ${getSeverityClasses(
                    selectedIncident.severity
                  )}`}
                >
                  {selectedIncident.severity.charAt(0).toUpperCase() +
                    selectedIncident.severity.slice(1)}{" "}
                  severity
                </span>
                <span
                  className={`rounded-md px-2.5 py-1.5 text-[10px] font-medium ${getStatusClasses(
                    selectedIncident.status
                  )}`}
                >
                  {statusLabels[selectedIncident.status]}
                </span>
              </div>

              <DetailField
                label="Location"
                value={selectedIncident.location}
              />
              <DetailField
                label="Category"
                value={categoryLabels[selectedIncident.category]}
              />
              <DetailField
                label="Reported"
                value={`${formatDate(
                  selectedIncident.occurred_at
                )} at ${formatTime(selectedIncident.occurred_at)}`}
              />
              <div>
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#899386]">
                  Description
                </p>
                <p className="text-xs leading-6 text-[#566354]">
                  {selectedIncident.description || "No description provided."}
                </p>
              </div>

              <div className="rounded-xl border border-[#e5e9e1] bg-[#f8faf6] p-3">
                <div className="flex items-start gap-2">
                  <ShieldCheck
                    size={16}
                    className="mt-0.5 shrink-0 text-[#557650]"
                  />
                  <div className="mt-5">
                    <IncidentEvidence incidentId={selectedIncident.id} />
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedIncident(null)}
                className="w-full rounded-xl bg-[#214b31] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#173b25]"
              >
                Close details
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  iconClass,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Activity;
  iconClass: string;
  trend: string;
}) {
  return (
    <section className="rounded-2xl border border-[#e3e8df] bg-white p-5 transition hover:border-[#d4ddcf] sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-medium text-[#7c8779]">{label}</p>
        <div
          className={`flex h-9 w-9 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={17} />
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between gap-2">
        <p className="text-[31px] font-semibold leading-none tracking-[-0.05em] text-[#263529]">
          {value}
        </p>
        <span className="mb-0.5 rounded-md bg-[#f5f7f2] px-2 py-1 text-[9px] font-medium text-[#73816f]">
          {trend}
        </span>
      </div>
      <p className="mt-3 text-[10px] text-[#939c8f]">{detail}</p>
    </section>
  );
}

function PatternRow({
  icon: Icon,
  title,
  description,
  value,
  iconClass,
}: {
  icon: typeof Activity;
  title: string;
  description: string;
  value: number;
  iconClass: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold text-[#455344]">{title}</p>
        <p className="mt-1 text-[10px] leading-4 text-[#929a8d]">
          {description}
        </p>
      </div>
      <span className="text-lg font-semibold tracking-tight text-[#40523e]">
        {value}
      </span>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[#edf0ea] pb-3">
      <p className="text-[10px] font-medium text-[#899386]">{label}</p>
      <p className="max-w-[65%] text-right text-xs font-medium text-[#455344]">
        {value}
      </p>
    </div>
  );
}
