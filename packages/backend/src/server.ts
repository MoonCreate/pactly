import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./root";
import { downloadBlob } from "./storage";
import { createTRPCContext } from "./trpc";

const PORT = Number(process.env.PORT ?? 3001);
const ALLOWED_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? ALLOWED_ORIGIN;
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-allow-credentials": "true",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

/**
 * Sniff a content-type from the first few bytes of a blob. Profile photos
 * are public bytes anyway; if the magic doesn't match a known image we fall
 * back to octet-stream so the client doesn't render garbage as text.
 */
function sniffContentType(bytes: Uint8Array): string {
  if (bytes.length >= 8 &&
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes.length >= 12 &&
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  if (bytes.length >= 4 &&
      bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // JSON / text bodies (chat ciphertext blobs are bytes, never served via this route).
  return "application/octet-stream";
}

// In-process LRU-ish cache so the same photo doesn't hit 0G on every render.
const blobCache = new Map<string, { bytes: Uint8Array; type: string }>();
const BLOB_CACHE_MAX = 200;

const HEX_64 = /^0x[0-9a-fA-F]{64}$/;

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (url.pathname === "/health") {
      return new Response("ok", { headers: corsHeaders(req) });
    }

    /**
     * GET /storage/blob/:rootHash — public read of a 0G blob.
     * Used by the frontend to display profile photos via <img src=…>.
     * Photos are public bytes; chat ciphertext is also public-but-encrypted, so
     * no auth gate is needed here.
     */
    if (req.method === "GET" && url.pathname.startsWith("/storage/blob/")) {
      const rootHash = url.pathname.slice("/storage/blob/".length);
      if (!HEX_64.test(rootHash)) {
        return new Response("bad rootHash", {
          status: 400,
          headers: corsHeaders(req),
        });
      }

      try {
        let entry = blobCache.get(rootHash);
        if (!entry) {
          const blob = await downloadBlob(rootHash);
          const bytes = new Uint8Array(await blob.arrayBuffer());
          const type = sniffContentType(bytes);
          entry = { bytes, type };
          if (blobCache.size >= BLOB_CACHE_MAX) {
            const firstKey = blobCache.keys().next().value;
            if (firstKey) blobCache.delete(firstKey);
          }
          blobCache.set(rootHash, entry);
        }

        return new Response(entry.bytes, {
          status: 200,
          headers: {
            ...corsHeaders(req),
            "content-type": entry.type,
            "cache-control": "public, max-age=86400, immutable",
          },
        });
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[blob]", rootHash, err);
        }
        return new Response("not found", {
          status: 404,
          headers: corsHeaders(req),
        });
      }
    }

    if (url.pathname.startsWith("/trpc")) {
      const res = await fetchRequestHandler({
        endpoint: "/trpc",
        req,
        router: appRouter,
        // Allow POST for queries — needed because httpBatchLink batches
        // queries into a POST when superjson serialisation is in use.
        allowMethodOverride: true,
        createContext: ({ req }) =>
          createTRPCContext({ headers: req.headers }),
        onError({ path, error }) {
          if (process.env.NODE_ENV !== "production") {
            console.error(`[trpc] ${path ?? "<root>"}:`, error.message);
          }
        },
      });
      const headers = new Headers(res.headers);
      for (const [k, v] of Object.entries(corsHeaders(req))) headers.set(k, v as string);
      return new Response(res.body, { status: res.status, headers });
    }

    return new Response("not found", { status: 404, headers: corsHeaders(req) });
  },
});

console.log(`pactly backend listening on http://localhost:${server.port}`);
