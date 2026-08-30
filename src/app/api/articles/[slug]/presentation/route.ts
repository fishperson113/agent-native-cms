import { createHash } from "node:crypto";

import { getActivePresentationArtifact } from "@/infrastructure/delivery/public-cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await params;
  try {
    const artifact = await getActivePresentationArtifact(slug);
    if (!artifact) {
      return Response.json(
        { error: "No active presentation artifact." },
        { status: 404 },
      );
    }

    const requestedVersion = new URL(request.url).searchParams.get("version");
    if (requestedVersion && requestedVersion !== artifact.id) {
      return Response.json(
        { error: "Presentation artifact version is no longer active." },
        { status: 404 },
      );
    }

    const hash = createHash("sha256")
      .update(artifact.compiledCode)
      .digest("hex");
    const etag = `"${hash}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new Response(null, { status: 304, headers: { ETag: etag } });
    }

    return new Response(artifact.compiledCode, {
      headers: {
        "Cache-Control": requestedVersion
          ? "public, max-age=31536000, immutable"
          : "no-store",
        "Content-Type": "text/javascript; charset=utf-8",
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
        "X-Presentation-Id": artifact.id,
      },
    });
  } catch {
    return Response.json({ error: "Article not found." }, { status: 404 });
  }
}
