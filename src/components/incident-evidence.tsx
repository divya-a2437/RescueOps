
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileImage,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import EvidenceUpload from "@/components/evidence-upload";

type Evidence = {
  id: string;
  incident_id: string;
  secure_url: string;
  resource_type?: string;
  description: string | null;
  created_at: string;
};

type IncidentEvidenceProps = {
  incidentId: string;
};

export default function IncidentEvidence({
  incidentId,
}: IncidentEvidenceProps) {
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvidence = useCallback(async () => {
    if (!incidentId) {
      setEvidence([]);
      setLoading(false);
      setError("An incident ID is required to load evidence.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/evidence?incidentId=${encodeURIComponent(incidentId)}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load evidence.");
      }

      setEvidence(Array.isArray(result.evidence) ? result.evidence : []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Unable to load evidence. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  function handleUploaded(newEvidence: Evidence) {
    setEvidence((current) => [
      newEvidence,
      ...current.filter((item) => item.id !== newEvidence.id),
    ]);
    setError("");
  }

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#243328]">
            Incident evidence
          </h3>
          <p className="mt-1 text-xs text-[#7a857a]">
            Supporting records linked to this incident.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadEvidence()}
          disabled={loading}
          aria-label="Refresh evidence"
          className="flex shrink-0 items-center gap-2 rounded-lg border border-[#dfe6dc] px-3 py-2 text-xs font-medium text-[#344a38] transition hover:bg-[#f4f8f2] disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={loading ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      <EvidenceUpload
        incidentId={incidentId}
        onUploaded={handleUploaded}
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-[#f0d6d1] bg-[#fbefed] p-3 text-sm text-[#a44736]"
        >
          <AlertCircle size={17} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => void loadEvidence()}
              className="mt-2 font-semibold underline underline-offset-2"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-[#e4e9e1] bg-[#fafcf9] py-8 text-sm text-[#718071]">
          <LoaderCircle size={17} className="animate-spin" />
          Loading evidence...
        </div>
      ) : !error && evidence.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d7e0d4] bg-[#fafcf9] px-5 py-8 text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#edf4eb] text-[#648268]">
            <FileImage size={21} />
          </div>
          <p className="mt-3 text-sm font-medium text-[#344237]">
            No evidence attached yet
          </p>
          <p className="mt-1 max-w-xs text-xs leading-5 text-[#7a857a]">
            Upload a supporting image above. It will appear here once saved.
          </p>
        </div>
      ) : !error ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {evidence.map((item) => (
            <article
              key={item.id}
              className="overflow-hidden rounded-xl border border-[#e4e9e1] bg-white"
            >
              <a
                href={item.secure_url}
                target="_blank"
                rel="noreferrer"
                aria-label="Open evidence image in a new tab"
                className="group relative block aspect-[4/3] overflow-hidden bg-[#f4f7f2]"
              >
                <img
                  src={item.secure_url}
                  alt={item.description || "Incident evidence"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#344a38] shadow-sm">
                  <ExternalLink size={15} />
                </span>
              </a>

              <div className="p-4">
                <p className="text-sm font-medium text-[#344237]">
                  {item.description || "Supporting evidence"}
                </p>
                <p className="mt-2 text-xs text-[#899188]">
                  Uploaded{" "}
                  {new Date(item.created_at).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
