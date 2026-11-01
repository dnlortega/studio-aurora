import { getCurrentUser } from "@/lib/auth/session";
import { getSettings } from "@/lib/settings";
import { SiteHeaderClient } from "@/components/site/site-header-client";

export async function SiteHeader() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <SiteHeaderClient
      salonName={settings.salonName}
      user={
        user
          ? {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role,
            }
          : null
      }
    />
  );
}
