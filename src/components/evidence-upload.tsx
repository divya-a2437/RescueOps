
"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  LoaderCircle,
  Upload,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

type Evidence = {
  id: string;
  incident_id: string;
  secure_url: string;
  resource_type?: string;
  description: string | null;
  created_at: string;
};

type EvidenceUploadProps = {
  incidentId: string;
  onUploaded?: (evidence: Evidence) => void;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export default function EvidenceUpload({
  incidentId,
  onUploaded,
}: EvidenceUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function clearPreview() {
    if (previewRef.current) {
      URL.revokeObjectURL(previewRef.current);
      previewRef.current = null;
    }

    setPreview("");
  }

  function resetForm() {
    clearPreview();
    setFile(null);
    setDescription("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0];

    setMessage("");
    setError(false);

    if (!selected) {
      return;
    }

    if (!ALLOWED_TYPES.has(selected.type)) {
      setError(true);
      setMessage("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    if (selected.size === 0 || selected.size > MAX_FILE_SIZE) {
      setError(true);
      setMessage("Choose an image larger than 0 bytes and no larger than 5 MB.");
      event.target.value = "";
      return;
    }

    clearPreview();

    const objectUrl = URL.createObjectURL(selected);
    previewRef.current = objectUrl;

    setFile(selected);
    setPreview(objectUrl);
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file || uploading) {
      return;
    }

    setUploading(true);
    setMessage("");
    setError(false);

    try {
      const formData = new FormData();

      // The API route uses this ID to link evidence to its incident.
      formData.append("incidentId", incidentId);
      formData.append("file", file);
      formData.append("description", description.trim());

      const response = await fetch("/api/evidence", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          typeof result.error === "string"
            ? result.error
            : "Unable to upload evidence."
        );
      }

      if (!result.evidence?.id || !result.evidence?.secure_url) {
        throw new Error("The server returned an invalid evidence record.");
      }

      onUploaded?.(result.evidence as Evidence);

      resetForm();
      setMessage("Evidence uploaded and linked to this incident.");
    } catch (uploadError) {
      setError(true);
      setMessage(
        uploadError instanceof Error
          ? uploadError.message
          : "Unable to upload evidence. Please try again."
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-[#e4e9e1] bg-white p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#edf4eb] text-[#315d3c]">
          <ImagePlus size={20} />
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#243328]">
            Attach incident evidence
          </h3>
          <p className="mt-1 text-xs leading-5 text-[#7a857a]">
            Upload a pickup photo, quantity record, or other supporting image.
            JPG, PNG, or WebP · Max 5 MB.
          </p>
        </div>
      </div>

      <form onSubmit={handleUpload} className="mt-5 space-y-4">
        <div>
          <label
            htmlFor={`evidence-file-${incidentId}`}
            className="sr-only"
          >
            Select incident evidence image
          </label>

          <label
            htmlFor={`evidence-file-${incidentId}`}
            className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#cbd8c9] bg-[#fafcf9] p-4 text-center transition hover:border-[#789678] hover:bg-[#f4f8f2]"
          >
            {preview ? (
              <div className="flex w-full flex-col items-center gap-3">
                <img
                  src={preview}
                  alt="Selected evidence preview"
                  className="max-h-48 max-w-full rounded-lg object-contain"
                />

                <span className="text-xs font-medium text-[#648268]">
                  Choose another image
                </span>
              </div>
            ) : (
              <>
                <Upload size={22} className="text-[#648268]" />
                <span className="mt-2 text-sm font-medium text-[#344a38]">
                  Choose an image
                </span>
                <span className="mt-1 text-xs text-[#8a9388]">
                  Select a file from your device
                </span>
              </>
            )}
          </label>

          <input
            ref={fileInputRef}
            id={`evidence-file-${incidentId}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={uploading}
            onChange={handleFileChange}
          />
        </div>

        {file && (
          <div className="flex items-center justify-between gap-3 rounded-lg bg-[#f7f9f5] px-3 py-2">
            <p className="min-w-0 truncate text-xs text-[#667366]">
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>

            <button
              type="button"
              onClick={resetForm}
              disabled={uploading}
              aria-label="Remove selected image"
              className="shrink-0 rounded-md p-1 text-[#7a857a] transition hover:bg-[#e9eee5] hover:text-[#344a38] disabled:opacity-50"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div>
          <label
            htmlFor={`evidence-description-${incidentId}`}
            className="mb-2 block text-sm font-medium text-[#344237]"
          >
            Description{" "}
            <span className="font-normal text-[#899188]">
              (optional)
            </span>
          </label>

          <textarea
            id={`evidence-description-${incidentId}`}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={500}
            rows={2}
            disabled={uploading}
            placeholder="e.g. Photo showing 32 boxes received instead of 50"
            className="w-full resize-y rounded-xl border border-[#dfe6dc] px-3 py-2.5 text-sm outline-none transition focus:border-[#739376] disabled:bg-[#f7f9f5]"
          />

          <p className="mt-1 text-right text-[11px] text-[#899188]">
            {description.length}/500
          </p>
        </div>

        {message && (
          <div
            role={error ? "alert" : "status"}
            className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
              error
                ? "bg-[#fbefed] text-[#a44736]"
                : "bg-[#edf6eb] text-[#315d3c]"
            }`}
          >
            {error ? (
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
            ) : (
              <CheckCircle2 size={17} className="mt-0.5 shrink-0" />
            )}

            <span>{message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={!file || uploading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1c4930] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#143a25] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {uploading ? (
            <>
              <LoaderCircle size={17} className="animate-spin" />
              Uploading evidence...
            </>
          ) : (
            <>
              <Upload size={17} />
              Upload evidence
            </>
          )}
        </button>
      </form>
    </section>
  );
}
