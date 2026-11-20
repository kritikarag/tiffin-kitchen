import { VERSION } from "@/lib/version";

// GET /api/version -> which build is running. Handy after "Update preview" on GoDaddy.
export function GET() {
  return Response.json({ version: VERSION });
}
