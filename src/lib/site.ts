import { NextResponse } from "next/server";

export function getOriginFromHeaders(headersList: Headers) {
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  return `${protocol}://${host}`;
}

export function buildRedirectUrl(request: Request, target: string) {
  return new URL(target, getOriginFromHeaders(new Headers(request.headers)));
}

export function buildSeeOtherResponse(request: Request, target: string) {
  return NextResponse.redirect(buildRedirectUrl(request, target), { status: 303 });
}

export function buildInstallCommand(slug: string, registry: string) {
  return `npx clawhub install ${slug} --registry ${registry}`;
}
