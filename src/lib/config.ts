export function getAdminCredentials() {
  return {
    username: process.env.ADMIN_USERNAME?.trim() || "superadmin",
    password: process.env.ADMIN_PASSWORD?.trim() || "ChangeMe_2026!",
    sessionSecret:
      process.env.SESSION_SECRET?.trim() || "replace-with-a-long-random-secret",
  };
}
