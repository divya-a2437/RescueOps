
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { cloudinary } from "@/lib/cloudinary";


const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

const FILE_SIGNATURES: Record<string, number[][]> = {
  "image/jpeg": [[0xff, 0xd8, 0xff]],
  "image/png": [
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  ],
  "image/webp": [
    [0x52, 0x49, 0x46, 0x46],
  ],
};

function hasValidSignature(
  buffer: Buffer,
  contentType: string
): boolean {
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

    // RLS ensures that only evidence belonging to incidents
    // accessible to this user can be returned.
    const { data, error } = await supabase
      .from("evidence_assets")
      .select(
        "id, incident_id, secure_url, resource_type, description, created_at"
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

    return NextResponse.json({ evidence: data ?? [] });
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

    if (
      typeof incidentId !== "string" ||
      !incidentId.trim()
    ) {
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

    // Confirm the incident belongs to the signed-in user.
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

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

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
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `rescueops/${user.id}/${incidentId}`,
          resource_type: "image",
          allowed_formats: ["jpg", "jpeg", "png", "webp"],
        },
        (error, result) => {
          if (error || !result) {
            reject(error ?? new Error("Cloudinary upload failed."));
            return;
          }

          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            resource_type: result.resource_type,
          });
        }
      );

      uploadStream.end(buffer);
    });

    uploadedPublicId = uploadResult.public_id;

    const { data: evidence, error: insertError } = await supabase
      .from("evidence_assets")
      .insert({
        incident_id: incidentId,
        cloudinary_public_id: uploadResult.public_id,
        secure_url: uploadResult.secure_url,
        resource_type: uploadResult.resource_type,
        description: description || null,
      })
      .select(
        "id, incident_id, secure_url, resource_type, description, created_at"
      )
      .single();

    if (insertError) {
      console.error("Evidence database insert failed:", insertError);

      // Avoid leaving an orphaned Cloudinary asset if the DB insert fails.
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

    return NextResponse.json({ evidence }, { status: 201 });
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
