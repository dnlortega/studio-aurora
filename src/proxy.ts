import { NextResponse, type NextRequest } from "next/server";

const COOKIE_NAME = "aurora_sessao";

/**
 * Camada de conveniência: redireciona visitantes sem cookie de sessão das
 * áreas privadas. A autorização real acontece sempre nos layouts, páginas e
 * Server Actions — nunca aqui.
 */
export default function proxy(request: NextRequest) {
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) return NextResponse.next();

  const url = request.nextUrl.clone();
  const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  url.pathname = "/entrar";
  url.search = "";
  url.searchParams.set("next", destination);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/painel", "/painel/:path*", "/admin", "/admin/:path*"],
};
