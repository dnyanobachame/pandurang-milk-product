'use client';

import { useState } from 'react';
import {
  Bell,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { roleLabel } from '@/lib/role-labels';

type AdminHeaderProps = {
  userName?: string;
  userRole?: string;
  onMenuClick?: () => void;
};

export default function AdminHeader({
  userName,
  userRole,
  onMenuClick,
}: AdminHeaderProps) {
  const { profile } = useAuth();

  const [notificationsOpen, setNotificationsOpen] =
    useState(false);

  const displayName =
    userName ||
    profile?.full_name ||
    'Admin';

  const displayRole =
    userRole ||
    String(profile?.role ?? 'staff');

  const contextTitle = (() => {
    switch (displayRole) {
      case 'admin':
        return 'Admin Console';

      case 'production_manager':
      case 'production_staff':
        return 'Production Operations';

      case 'quality_control':
        return 'Quality Control';

      case 'inventory_manager':
        return 'Inventory Operations';

      case 'sales_manager':
        return 'Sales Operations';

      case 'accountant':
        return 'Finance Operations';

      case 'customer_support':
        return 'Customer Support';

      case 'delivery_manager':
        return 'Delivery Operations';

      default:
        return 'Operations';
    }
  })();

  const initial =
    displayName
      .trim()
      .charAt(0)
      .toUpperCase() || 'A';

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/85">
      <div className="relative flex min-h-[72px] items-center gap-2 px-3 sm:gap-3 sm:px-6 lg:px-8">

        {/* MOBILE MENU */}
        <button
          type="button"
          onClick={onMenuClick}
          aria-label="Open admin navigation"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 lg:hidden"
        >
          <Menu
            aria-hidden="true"
            className="h-5 w-5"
          />
        </button>

        {/* BRAND / CONTEXT */}
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden="true"
              className="hidden h-2 w-2 shrink-0 rounded-full bg-red-600 shadow-[0_0_0_3px_rgba(220,38,38,0.08)] sm:block"
            />

            <div className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-red-600">
              Pandurang Milk Product
            </div>
          </div>

          <div className="mt-0.5 truncate text-sm font-semibold text-slate-900 sm:text-base">
            {contextTitle}
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">

          {/* NOTIFICATIONS */}
          <div className="relative">
            <button
              type="button"
              onClick={() =>
                setNotificationsOpen(
                  (current) => !current,
                )
              }
              aria-label={
                notificationsOpen
                  ? 'Close notifications'
                  : 'Open notifications'
              }
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              {notificationsOpen ? (
                <X
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              ) : (
                <Bell
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              )}

              <span
                aria-hidden="true"
                className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-red-500 ring-2 ring-white"
              />
            </button>

            {notificationsOpen ? (
              <>
                {/* BACKDROP */}
                <button
                  type="button"
                  aria-label="Close notifications"
                  onClick={() =>
                    setNotificationsOpen(false)
                  }
                  className="fixed inset-0 z-40 cursor-default bg-transparent"
                />

                {/* NOTIFICATION PANEL */}
                <div
                  role="dialog"
                  aria-label="Notifications"
                  aria-modal="false"
                  className="absolute right-0 top-[calc(100%+10px)] z-50 w-[min(320px,calc(100vw-24px))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]"
                >
                  <div className="border-b border-slate-100 px-4 py-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-slate-900">
                          Notifications
                        </div>

                        <div className="mt-0.5 text-xs text-slate-500">
                          Admin activity
                        </div>
                      </div>

                      <div
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-50"
                      >
                        <Bell className="h-4 w-4 text-red-600" />
                      </div>
                    </div>
                  </div>

                  <div className="px-4 py-4">
                    <div
                      role="status"
                      aria-live="polite"
                      className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-center"
                    >
                      <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm">
                        <Bell
                          aria-hidden="true"
                          className="h-4 w-4 text-slate-400"
                        />
                      </div>

                      <div className="mt-3 text-sm font-semibold text-slate-700">
                        No new notifications
                      </div>

                      <p className="mx-auto mt-1 max-w-[240px] text-xs leading-5 text-slate-500">
                        New payment reviews, orders and operational
                        alerts will appear here.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* DESKTOP USER */}
          <div className="hidden items-center gap-2.5 sm:flex">
            <div className="hidden text-right md:block">
              <div className="max-w-[180px] truncate text-sm font-semibold text-slate-900">
                {displayName}
              </div>

              <div className="mt-0.5 max-w-[180px] truncate text-xs text-slate-500">
                {roleLabel(displayRole as any)}
              </div>
            </div>

            <div
              aria-hidden="true"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm ring-4 ring-red-50"
            >
              {initial}
            </div>

            <ChevronDown
              aria-hidden="true"
              className="h-4 w-4 text-slate-400"
            />
          </div>

          {/* MOBILE USER */}
          <div
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-sm font-bold text-white shadow-sm ring-4 ring-red-50 sm:hidden"
          >
            {initial}
          </div>
        </div>

        {/* ADMIN CORNER MARK */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-1 h-1.5 w-1.5 rounded-full bg-red-500/70 sm:bottom-1.5 sm:right-2"
        />
      </div>
    </header>
  );
}