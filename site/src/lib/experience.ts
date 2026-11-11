import type { Role } from "./schemas";
export function groupExperience(roles: Role[]) {
  const groups: { company: string; dates: string; roles: Role[] }[] = [];
  for (const role of [...roles].reverse()) {
    const previous = groups.at(-1);
    if (previous?.company === role.company) previous.roles.push(role);
    else groups.push({ company: role.company, dates: "", roles: [role] });
  }
  return groups.map((group) => ({
    ...group,
    dates:
      group.roles.length > 1
        ? `${group.roles.at(-1)!.dateRange.split(" - ")[0]} — ${group.roles[0].dateRange.split(" - ")[1]}`
        : group.roles[0].dateRange,
  }));
}

/**
 * The job title and employer shown wherever the exact title is machine-read (search-engine data, link
 * previews). It is the current role on the Experience page, so editing that role in the console
 * changes it everywhere. The hero's self-description is separate, hand-written copy.
 */
export function currentRole(roles: readonly Role[]): { title: string; company: string } | undefined {
  const role = [...roles].reverse().find((r) => r.isCurrent);
  return role && { title: role.title, company: role.company };
}
