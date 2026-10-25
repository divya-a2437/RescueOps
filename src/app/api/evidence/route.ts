
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cloudinary } from "@/lib/cloudinary";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  "image/webp": [[0x52, 0x49, 0x46, 0x46]],
};

type CloudinaryAITag = {
  name?: unknown;
  tag?: unknown;
};

function hasValidSignature(buffer: Buffer, contentType: string): boolean {
  const signatures = FILE_SIGNATURES[contentType];

  if (!signatures) return false;

  if (contentType === "image/webp") {
    return (
      signatures.some((signature) =>
        signature.every((byte, index) => buffer[index] === byte)
      ) &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    );
  }

  return signatures.some((signature) =>
    signature.every((byte, index) => buffer[index] === byte)
  );
}

async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null };
  }

  return { supabase, user };
}

function getPreviewUrl(publicId: string) {
  return cloudinary.url(publicId, {
    secure: true,
    transformation: [
      { width: 640, height: 480, crop: "limit" },
      { quality: "auto", fetch_format: "auto" },
    ],
  });
}

/**
 * Requests Cloudinary AI Vision custom tagging.
 * Tagging is best-effort: an AI failure must not prevent evidence uploads.
 */
async function analyzeEvidenceTags(imageUrl: string): Promise<string[]> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.warn(
      "Cloudinary AI tagging skipped: Cloudinary credentials are missing."
    );
    return [];
  }

  try {
    const credentials = Buffer.from(`${apiKey}:${apiSecret}`).toString(
      "base64"
    );

    const response = await fetch(
      `https://api.cloudinary.com/v2/analysis/${encodeURIComponent(
        cloudName
      )}/analyze/ai_vision_tagging`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            uri: imageUrl,
          },
          tag_definitions: [
            {
              name: "visible-damage",
              description:
                "The image visibly shows physical damage, breakage, tearing, or deformation.",
            },
            {
              name: "packaging-issue",
              description:
                "The image shows damaged, defective, opened, or improperly sealed packaging.",
            },
            {
              name: "spillage-or-leak",
              description:
                "The image shows spilled material, leakage, liquid escaping, or a visible spill.",
            },
            {
              name: "food-or-perishable-item",
              description:
                "The image contains food, groceries, or other perishable items.",
            },
            {
              name: "label-or-document",
              description:
                "The image prominently shows a label, printed document, receipt, product marking, or written record.",
            },
            {
              name: "unsafe-environment",
              description:
                "The image visibly shows a potentially unsafe environment, obstruction, or physical hazard.",
            },
            {
              name: "missing-or-displaced_item",
              description:
                "The image shows a displaced object or a visible indication that an item is absent from its expected place.",
            },
            {
              name: "delivery-or-collection_evidence",
              description:
                "The image shows a delivery, parcel handover, collection activity, or goods awaiting collection.",
            },
          ],
        }),
        cache: "no-store",
      }
    );

    const responseText = await response.text();

    console.log("[AI TAGGING] HTTP status:", response.status);
    console.log("[AI TAGGING] Response:", responseText);

    if (!response.ok) {
      console.error(
        "Cloudinary AI tagging failed:",
        response.status,
        responseText
      );
      return [];
    }

    let result: unknown;

    try {
      result = responseText ? JSON.parse(responseText) : {};
    } catch {
      console.error("Cloudinary AI tagging returned invalid JSON.");
      return [];
    }

    // The API may accept an analysis request before its result is ready.
    if (response.status === 202) {
      console.warn(
        "Cloudinary AI tagging was accepted but is not complete yet."
      );
      return [];
    }

    const root = result as {
      data?: {
        analysis?: { tags?: unknown };
        tags?: unknown;
      };
      analysis?: { tags?: unknown };
      tags?: unknown;
    };

    const possibleTags =
      root?.data?.analysis?.tags ??
      root?.data?.tags ??
      root?.analysis?.tags ??
      root?.tags;

    if (!Array.isArray(possibleTags)) {
      console.warn(
        "Cloudinary AI tagging response did not contain a tags array."
      );
      return [];
    }

    const tags = (possibleTags as (CloudinaryAITag | string)[])
      .map((item) => {
        if (typeof item === "string") return item;

        if (item && typeof item === "object") {
          if (typeof item.name === "string") return item.name;
          if (typeof item.tag === "string") return item.tag;
        }

        return null;
      })
      .filter(
        (tag): tag is string =>
          typeof tag === "string" && tag.length > 0
      );

    return [...new Set(tags)];
  } catch (error) {
    console.error("Cloudinary AI tagging error:", error);
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view evidence." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const incidentId = searchParams.get("incidentId");

    if (!incidentId) {
      return NextResponse.json(
        { error: "An incidentId is required." },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("evidence_assets")
      .select(
        "id, incident_id, cloudinary_public_id, secure_url, resource_type, description, quality_score, ai_tags, created_at"
      )
      .eq("incident_id", incidentId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Evidence retrieval failed:", error);

      return NextResponse.json(
        { error: "Unable to retrieve evidence." },
        { status: 500 }
      );
    }

    const evidence = (data ?? []).map((item) => ({
      ...item,
      ai_tags: Array.isArray(item.ai_tags) ? item.ai_tags : [],
      preview_url: getPreviewUrl(item.cloudinary_public_id),
    }));

    return NextResponse.json({ evidence });
  } catch (error) {
    console.error("Evidence GET failed:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  let uploadedPublicId: string | null = null;

  try {
    const { supabase, user } = await getAuthenticatedUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to upload evidence." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const incidentId = formData.get("incidentId");
    const file = formData.get("file");
    const descriptionValue = formData.get("description");

    if (typeof incidentId !== "string" || !incidentId.trim()) {
      return NextResponse.json(
        { error: "A valid incidentId is required." },
        { status: 400 }
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Please select an image to upload." },
        { status: 400 }
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Only JPEG, PNG, and WebP images are supported." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "The image must be smaller than 5 MB." },
        { status: 400 }
      );
    }

    const description =
      typeof descriptionValue === "string"
        ? descriptionValue.trim().slice(0, 500)
        : "";

    // Verify that the signed-in user can access this incident.
    const { data: incident, error: incidentError } = await supabase
      .from("incidents")
      .select("id")
      .eq("id", incidentId)
      .maybeSingle();

    if (incidentError) {
      console.error("Incident verification failed:", incidentError);

      return NextResponse.json(
        { error: "Unable to verify the incident." },
        { status: 500 }
      );
    }

    if (!incident) {
      return NextResponse.json(
        { error: "Incident not found or access denied." },
        { status: 404 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!hasValidSignature(buffer, file.type)) {
      return NextResponse.json(
        { error: "The uploaded file does not appear to be a valid image." },
        { status: 400 }
      );
    }

    const uploadResult = await new Promise<{
      public_id: string;
      secure_url: string;
      resource_type: string;
      quality_score: number | null;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `rescueops/${user.id}/${incidentId}`,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
          quality_analysis: true,
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed."));
            return;
          }

          // Store Cloudinary's focus score when available.
          const analysis = result.quality_analysis as
            | { focus?: number }
            | undefined;

          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
            quality_score:
              typeof analysis?.focus === "number"
                ? analysis.focus
                : null,
          });
        }
      );

      uploadStream.end(buffer);
    });

    uploadedPublicId = uploadResult.public_id;

    // AI tagging is best-effort; uploads continue if tagging fails.
    const aiTags = await analyzeEvidenceTags(uploadResult.secure_url);

    const { data: evidence, error: insertError } = await supabase
      .from("evidence_assets")
      .insert({
        incident_id: incidentId,
        cloudinary_public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        resource_type: uploadResult.resource_type,
        description: description || null,
        quality_score: uploadResult.quality_score,
        ai_tags: aiTags,
      })
      .select(
        "id, incident_id, cloudinary_public_id, secure_url, resource_type, description, quality_score, ai_tags, created_at"
      )
      .single();

    if (insertError) {
      console.error("Evidence database insert failed:", insertError);

      try {
        await cloudinary.uploader.destroy(uploadResult.public_id, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError);
      }

      uploadedPublicId = null;

      return NextResponse.json(
        { error: "Image uploaded, but saving its evidence record failed." },
        { status: 500 }
      );
    }

    uploadedPublicId = null;

    return NextResponse.json(
      {
        evidence: {
          ...evidence,
          ai_tags: Array.isArray(evidence.ai_tags) ? evidence.ai_tags : [],
          preview_url: getPreviewUrl(uploadResult.public_id),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Evidence POST failed:", error);

    if (uploadedPublicId) {
      try {
        await cloudinary.uploader.destroy(uploadedPublicId, {
          resource_type: "image",
        });
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError);
      }
    }

    return NextResponse.json(
      { error: "An unexpected error occurred while uploading evidence." },
      { status: 500 }
    );
  }
}
