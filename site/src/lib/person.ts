import { currentRole } from "./experience";
import { sameAs } from "./profiles";
import type { Profile, Role } from "./schemas";
import { site } from "./site";

/**
 * Search-engine data about Asad. The job title is the current role on the Experience page, so it
 * follows the console; it is left out when no role is marked current. "Same as" lists the profile
 * links the owner has added, and nothing else.
 */
export function personJsonLd(profiles: readonly Profile[], roles: readonly Role[]) {
  const role = currentRole(roles);
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    name: site.name,
    url: site.url,
    ...(role && { jobTitle: role.title, worksFor: { "@type": "Organization", name: role.company } }),
    sameAs: sameAs(profiles),
  };
}
