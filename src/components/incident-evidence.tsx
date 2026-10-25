
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  ExternalLink,
  FileImage,
  LoaderCircle,
  RefreshCw,
  ScanSearch,
  ShieldCheck,
  CircleAlert,
} from "lucide-react";
import EvidenceUpload from "@/components/evidence-upload";

type Evidence = {
  id: string;
  incident_id: string;
  secure_url: string;
  preview_url?: string;
  resource_type?: string;
  description: string | null;
  quality_score?: number | null;
  created_at: string;
};

type IncidentEvidenceProps = {
  incidentId: string;
};

function QualityIndicator({
  score,
}: {
  score?: number | null;
}) {
  if (typeof score !== "number" || !Number.isFinite(score)) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f3f5f1] px-2.5 py-1 text-xs text-[#727c70]">
        <ScanSearch size={13} />
        Quality score unavailable
      </span>
    );
  }

  const percentage = Math.round(score * 100);
  const isLow = score < 0.5;
  const isGood = score >= 0.75;

  const styles = isLow
    ? "border-[#f0d6d1] bg-[#fbefed] text-[#a44736]"
    : isGood
      ? "border-[#d7e6d3] bg-[#edf5e9] text-[#426b45]"
      : "border-[#eadfbd] bg-[#faf5e7] text-[#8b6b27]";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#586657]">
          <ScanSearch size={14} />
          Image focus score
        </span>

        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${styles}`}
        >
          {percentage}%
        </span>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-[#edf0ea]"
        role="progressbar"
        aria-label="Image focus score"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.max(0, Math.min(100, percentage))}
      >
        <div
          className={`h-full rounded-full transition-all ${
            isLow
              ? "bg-[#c76b5c]"
              : isGood
                ? "bg-[#6e9870]"
                : "bg-[#c4a354]"
          }`}
          style={{
            width: `${Math.max(0, Math.min(100, percentage))}%`,
          }}
        />
      </div>

      <p className="flex items-start gap-1.5 text-xs leading-5 text-[#7a857a]">
        {isLow ? (
          <>
            <CircleAlert
              size={14}
              className="mt-0.5 shrink-0 text-[#a44736]"
            />
            Low focus score. Check the image details and consider retaking it.
          </>
        ) : isGood ? (
          <>
            <ShieldCheck
              size={14}
              className="mt-0.5 shrink-0 text-[#648268]"
            />
            Strong focus score. Verify that the evidence details are readable.
          </>
        ) : (
          <>
            <ScanSearch size={14} className="mt-0.5 shrink-0" />
            Moderate focus score. Check important details for clarity.
          </>
        )}
      </p>
    </div>
  );
}

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
            Supporting records with optimised previews and image focus analysis.
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
                aria-label="Open original evidence image in a new tab"
                className="group relative block aspect-[4/3] overflow-hidden bg-[#f4f7f2]"
              >
                <img
                  src={item.preview_url || item.secure_url}
                  alt={item.description || "Incident evidence"}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                />
                <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-[#344a38] shadow-sm">
                  <ExternalLink size={15} />
                </span>
                <span className="absolute bottom-3 left-3 rounded-md bg-[#243328]/85 px-2 py-1 text-[10px] font-medium text-white">
                  Cloudinary optimised preview
                </span>
              </a>

              <div className="space-y-4 p-4">
                <div>
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

                <div className="border-t border-[#edf0ea] pt-3">
                  <QualityIndicator score={item.quality_score} />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
