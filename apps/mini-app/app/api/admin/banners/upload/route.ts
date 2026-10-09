import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { hasAdminPermission } from "@/lib/admin/authorization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 5 * 1024 * 1024;

const IMAGE_TYPES = {
  "image/jpeg": { extension: "jpg", signature: (b: Buffer) =>
    b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { extension: "png", signature: (b: Buffer) =>
    b.length >= 8 &&
    b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  "image/webp": { extension: "webp", signature: (b: Buffer) =>
    b.length >= 12 &&
    b.toString("ascii", 0, 4) === "RIFF" &&
    b.toString("ascii", 8, 12) === "WEBP" },
  "image/gif": { extension: "gif", signature: (b: Buffer) =>
    b.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(b.toString("ascii", 0, 6)) },
} as const;

export async function POST(request: NextRequest) {
  try {
    if (!(await hasAdminPermission("manage_settings"))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Choose an image file to upload." },
        { status: 400 }
      );
    }

    if (file.size === 0 || file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Image must be between 1 byte and 5 MB." },
        { status: 400 }
      );
    }

    const imageType =
      IMAGE_TYPES[file.type as keyof typeof IMAGE_TYPES];

    if (!imageType) {
      return NextResponse.json(
        { error: "Use a JPEG, PNG, WebP, or GIF image." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    if (!imageType.signature(bytes)) {
      return NextResponse.json(
        { error: "The file content does not match a supported image type." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SECRET_KEY;

    if (!url || !key) {
      throw new Error("Supabase configuration is missing.");
    }

    const supabase = createClient(url, key);
    const path = `${randomUUID()}.${imageType.extension}`;

    const { error: uploadError } = await supabase.storage
      .from("pablot-banners")
      .upload(path, bytes, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Banner image upload failed:", uploadError.message);
      return NextResponse.json(
        { error: "Unable to upload the image. Check the Storage bucket." },
        { status: 500 }
      );
    }

    const { data } = supabase.storage
      .from("pablot-banners")
      .getPublicUrl(path);

    return NextResponse.json(
      { imageUrl: data.publicUrl },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error(
      "Banner upload error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Unable to upload the image." },
      { status: 500 }
    );
  }
}
