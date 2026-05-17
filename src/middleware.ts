import { type NextRequest } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

export async function middleware(request: NextRequest) {
  return createClient(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files and images.
     * This keeps sessions refreshed on every navigation.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
