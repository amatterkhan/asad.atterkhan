import { apiError, requireOwnerIdentity } from "@/lib/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { uid } = await requireOwnerIdentity(request);
    return Response.json(
      { uid },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return apiError(error);
  }
}
