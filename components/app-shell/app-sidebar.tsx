"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType, type ReactNode } from "react";
import {
  Landmark,
  LayoutDashboard,
  LogOut,
  Receipt,
  Vault,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { ThemeToggle } from "@/components/application/theme/theme-toggle";
import { logout } from "@/lib/actions/auth";
import { cx } from "@/utils/cx";
import { SIDEBAR_COOKIE } from "./constants";

// Adapted from BoardUI's DashboardSidebar (components/application/dashboard),
// trimmed to this app's four destinations. Collapsed state is persisted in a
// cookie so the server renders the right width on first paint.

type IconComponent = ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>;

const NAV: { href: string; label: string; icon: IconComponent }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/pots", label: "Pots", icon: Vault },
  { href: "/lockers", label: "Lockers", icon: Landmark },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Label slot that fades + shrinks away as the rail collapses. */
function Collapsible({ collapsed, children }: { collapsed: boolean; children: ReactNode }) {
  return (
    <span
      className={cx(
        "flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "max-w-0 opacity-0 blur-[3px]" : "max-w-full opacity-100 blur-0",
      )}
    >
      {children}
    </span>
  );
}

const rowClass = (collapsed: boolean, selected = false) =>
  cx(
    "flex items-center gap-2 overflow-hidden rounded-2lg p-2 outline-none focus-visible:ring-2 focus-visible:ring-border-focus-ring",
    "transition-[width,background-color] duration-200 ease-out motion-reduce:transition-none",
    collapsed ? "w-9" : "w-full",
    selected
      ? "bg-linear-to-b from-accent-500 to-accent-600 shadow-nav-selected"
      : "cursor-pointer hover:bg-background-secondary-hover",
  );

export function AppSidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
  }

  return (
    <aside
      className={cx(
        "flex h-full shrink-0 flex-col justify-between overflow-hidden",
        "rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar",
        "transition-[width] duration-200 ease-out motion-reduce:transition-none",
        collapsed ? "w-[60px] px-[11px] py-3" : "w-[240px] p-3",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className={cx("flex items-center", collapsed ? "justify-center" : "justify-between ps-2")}>
          <Collapsible collapsed={collapsed}>
            <span className="text-headline-semibold whitespace-nowrap text-text-primary">Pots</span>
          </Collapsible>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-expanded={!collapsed}
            className="flex size-9 cursor-pointer items-center justify-center rounded-2lg text-foreground-icon-secondary outline-none hover:bg-background-secondary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden />
            )}
          </button>
        </div>

        <nav aria-label="Main" className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const selected = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={selected ? "page" : undefined}
                aria-label={collapsed ? label : undefined}
                title={collapsed ? label : undefined}
                className={rowClass(collapsed, selected)}
              >
                <Icon
                  className={cx("size-5 shrink-0", selected ? "text-white" : "text-foreground-icon-secondary")}
                  aria-hidden
                />
                <Collapsible collapsed={collapsed}>
                  <span
                    className={cx(
                      "text-body-medium whitespace-nowrap",
                      selected ? "text-white" : "text-text-secondary",
                    )}
                  >
                    {label}
                  </span>
                </Collapsible>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {collapsed ? (
          <ThemeToggle collapsed transitionDuration={300} />
        ) : (
          <ThemeToggle appearance="sidebar-segmented" transitionDuration={300} />
        )}
        <form action={logout}>
          <button
            type="submit"
            aria-label={collapsed ? "Sign out" : undefined}
            title={collapsed ? "Sign out" : undefined}
            className={rowClass(collapsed)}
          >
            <LogOut className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            <Collapsible collapsed={collapsed}>
              <span className="text-body-medium whitespace-nowrap text-text-secondary">Sign out</span>
            </Collapsible>
          </button>
        </form>
      </div>
    </aside>
  );
}
