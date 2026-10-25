"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { site } from "@/lib/site";
const links = [
    ["/lab", "The Lab"],
  ["/workbench", "Workbench"],
  ["/experience", "Experience"],
  ["/achievements", "Achievements"],
  ["/about", "About"],
];
export function Brand() {
  return (
    <Link href="/" className="brand" aria-label="ASAD.EXE home">
      Asad<span>.exe</span>
    </Link>
  );
}
export function Nav() {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const active = (href: string) =>
    href === "/"
      ? path === "/"
      : path.startsWith(href) ||
        (href === "/lab" && path.startsWith("/preview/"));
  return (
    <>
      <nav className="desktop-nav" aria-label="Main navigation">
        {links.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={active(href) ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        ref={trigger}
        className="menu-trigger"
        aria-label="Open navigation menu"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <span aria-hidden="true">Menu</span>
      </button>
      <dialog
        aria-label="Navigation menu"
        className="mobile-menu"
        ref={dialog}
        onClose={() => trigger.current?.focus()}
      >
        <div className="mobile-menu-head">
          <Brand />
          <button
            aria-label="Close navigation menu"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </div>
        <nav aria-label="Mobile navigation">
          {links.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              aria-current={active(href) ? "page" : undefined}
              onClick={() => dialog.current?.close()}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mobile-menu-links">
          <Link href="/calendar" onClick={() => dialog.current?.close()}>
            <span>Calendar</span>
          </Link>
          <a href={site.github}>
            <span>GitHub</span>
          </a>
          <a href={site.linkedin}>
            <span>LinkedIn</span>
          </a>
          <a href={`mailto:${site.email}`}>
            <span>Email</span>
          </a>
        </div>
      </dialog>
      <noscript>
        <nav
          className="noscript-nav"
          aria-label="Navigation without JavaScript"
        >
          {links.map(([href, label]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
      </noscript>
    </>
  );
}
