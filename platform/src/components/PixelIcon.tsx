// Icons from pixelarticons (MIT, https://pixelarticons.com): 24px pixel-grid icons in currentColor.
import { Briefcase, ExternalLink, Github, Linkedin, Mail, Trophy } from "pixelarticons/react";

const ICONS = {
  github: Github,
  linkedin: Linkedin,
  mail: Mail,
  briefcase: Briefcase,
  medal: Trophy,
  external: ExternalLink,
} as const;
export type IconName = keyof typeof ICONS;

export function PixelIcon({ name, className = "" }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon className={`pixel-icon ${className}`} aria-hidden="true" focusable="false" />;
}
