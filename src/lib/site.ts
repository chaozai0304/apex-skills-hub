import { networkInterfaces } from "node:os";

import { NextResponse } from "next/server";

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

export function getOriginFromHeaders(headersList: Headers, options?: { preferNetworkIp?: boolean }) {
  const host =
    headersList.get("x-forwarded-host") ?? headersList.get("host") ?? "localhost:3000";
  const protocol = headersList.get("x-forwarded-proto") ?? "http";

  if (options?.preferNetworkIp) {
    const { hostname, port } = splitHostPort(host);
    if (LOCAL_HOSTNAMES.has(hostname)) {
      const ip = getLocalNetworkIp();
      return `${protocol}://${ip}${port ? `:${port}` : ""}`;
    }
  }

  return `${protocol}://${host}`;
}

export function getRuntimeOriginFromRequest(request: Request) {
  return getOriginFromHeaders(new Headers(request.headers), { preferNetworkIp: true });
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

function splitHostPort(host: string) {
  const normalized = host.trim();
  if (normalized.startsWith("[")) {
    const closingIndex = normalized.indexOf("]");
    return {
      hostname: closingIndex > -1 ? normalized.slice(0, closingIndex + 1) : normalized,
      port: closingIndex > -1 && normalized[closingIndex + 1] === ":" ? normalized.slice(closingIndex + 2) : "",
    };
  }

  const parts = normalized.split(":");
  if (parts.length === 2) {
    return { hostname: parts[0], port: parts[1] };
  }

  return { hostname: normalized, port: "" };
}

function getLocalNetworkIp() {
  for (const interfaces of Object.values(networkInterfaces())) {
    for (const item of interfaces ?? []) {
      if (item.family === "IPv4" && !item.internal) {
        return item.address;
      }
    }
  }

  return "127.0.0.1";
}
