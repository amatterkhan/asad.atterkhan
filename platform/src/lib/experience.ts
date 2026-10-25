export type Role = {
  id: number;
  title: string;
  company: string;
  dateRange: string;
  responsibilities: string[];
  promotionFrom?: number;
  isCurrent?: boolean;
};
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
