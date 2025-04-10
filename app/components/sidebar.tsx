"use client";

import Button from "@/app/components/ui/button";
import { cn } from "@/lib/utils";
import { Gauge, Loader2, Search, Table2, Terminal } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Logo } from "@/app/components/ui/logo";

import { UserRound, Bolt, LogOut } from "lucide-react";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import { useMutation } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { useSessionStorage } from "react-use";

const sections = [
   [{ href: "/dashboard", label: "Dashboard", icon: Gauge, toggle: false }],
   [
      { href: "/database", label: "Databases", icon: Table2, toggle: true },
      { href: "/sql-terminal", label: "SQL Terminal", icon: Terminal, toggle: false },
      { href: "/search-engine", label: "Search Everywhere", icon: Search, toggle: false },
   ],
] as const;

const sidebarAnimationDuration = 0.2;
function Sidebar() {
   const pathname = usePathname();
   const isCurrentPath = (href: string) => {
      return pathname.startsWith(href.split("/*")?.[0] ?? "");
   };

   const [hide, setHide] = useSessionStorage<boolean>("sub-sidebar", false);

   return (
      <motion.aside
         initial={{ marginLeft: -45 }}
         animate={{ marginLeft: 0 }}
         exit={{ marginLeft: -45 }}
         transition={{
            type: "tween",
            ease: "circInOut",
            duration: sidebarAnimationDuration,
         }}
         className="sticky top-0 z-[3] flex w-[calc(2.75rem+1px)] flex-col self-stretch border-r bg-gray-100 md:w-[calc(3rem+1px)]"
      >
         <div className="bg-background grid max-h-[calc(2.5rem+1px)] place-items-center border-b py-2">
            <Logo className="size-6" />
         </div>

         <nav className="flex shrink-0 grow flex-col gap-2 self-stretch p-1">
            {sections.map((section, idx) => {
               return (
                  <div key={idx} className="flex flex-col gap-1 self-stretch">
                     {section.map((nav) => {
                        const isActive = isCurrentPath(nav.href);
                        return (
                           <TooltipProvider
                              key={nav.href}
                              delayDuration={0}
                              skipDelayDuration={0}
                              disableHoverableContent
                           >
                              <Tooltip>
                                 <TooltipTrigger asChild>
                                    <Link
                                       href={nav.href}
                                       aria-selected={isActive || undefined}
                                       onClick={(e) => {
                                          if (!isActive || !nav.toggle) return;
                                          e.preventDefault();
                                          setHide(!hide);
                                       }}
                                       className={cn([
                                          "group relative isolation-auto grid h-10 place-items-center rounded-md",
                                          isActive
                                             ? cn(
                                                  "!bg-background text-primary hover:text-primary-hover pr-px",
                                                  hide ? "" : null,
                                               )
                                             : "bg-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700",
                                       ])}
                                    >
                                       {isActive ? (
                                          <motion.span
                                             layoutId="sidebar-selector"
                                             className="bg-primary/15 group-hover:bg-primary/20 ring-primary/50 absolute inset-0 size-full rounded-[inherit] shadow-xs"
                                          />
                                       ) : null}
                                       <nav.icon className="size-5" strokeWidth={2} />
                                       <span className="sr-only">{nav.label}</span>
                                    </Link>
                                 </TooltipTrigger>
                                 <TooltipContent side="right" className="!pointer-events-none">
                                    {nav.label}
                                 </TooltipContent>
                              </Tooltip>
                           </TooltipProvider>
                        );
                     })}
                  </div>
               );
            })}
            <span role="separator" tabIndex={-1} aria-label="spacement" className="grow self-stretch" />
            <SidebarUser />
         </nav>
      </motion.aside>
   );
}

function SidebarUser() {
   const { data: session } = useSession();

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button
               intent="ghost"
               size="icon"
               className="size-9 text-gray-500 hover:bg-gray-200 hover:text-gray-700 aria-expanded:bg-gray-200 aria-expanded:shadow-inner md:size-10"
            >
               <UserRound className="size-5" />
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent side="top">
            <div className="flex items-center gap-2 p-1">
               {session?.user?.image ? (
                  <span
                     className="block size-8 rounded bg-contain"
                     style={{ backgroundImage: `url(${session?.user?.image})` }}
                  />
               ) : (
                  <span className="block size-8 rounded bg-gray-200" />
               )}
               <div className="flex flex-col">
                  <div className="text-foreground text-sm">
                     {session?.user?.id ?? 0} - {session?.user?.name ?? "Your username"}
                  </div>
                  <div className="text-xs text-gray-500">{session?.user?.email ?? "example@email.com"}</div>
               </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-between gap-4 pr-1">
               Command menu{" "}
               <div className="flex items-center gap-0.5">
                  <kbd className="font-geist-sans bg-background rounded-sm border px-1.5 py-0.5 text-xs hover:bg-gray-100">
                     Ctrl
                  </kbd>
                  <kbd className="font-geist-sans bg-background rounded-sm border px-1.5 py-0.5 text-xs hover:bg-gray-100">
                     K
                  </kbd>
               </div>
            </DropdownMenuItem>
            <div className="flex items-center gap-4 py-1.5 pl-2">
               <span className="text-sm text-gray-700">Theme</span>
               <div className="ml-auto aspect-[3/1] h-7 animate-pulse rounded bg-gray-200" />
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2" asChild>
               <Link href={`/settings/me`}>
                  Account settings
                  <Bolt className="ml-auto size-4 shrink-0 opacity-70" />
               </Link>
            </DropdownMenuItem>
            <SignOutButton />
            <DropdownMenuSeparator />
            <div className="p-1">
               <Button size="none" className="w-full px-2 py-1.5">
                  Upgrade to pro!
               </Button>
            </div>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

function SignOutButton() {
   const { mutate, isPending } = useMutation({
      mutationKey: ["sign-out"],
      mutationFn: async () => await signOut({ redirect: true, redirectTo: "/auth/sign-in" }),
   });

   return (
      <DropdownMenuItem
         disabled={isPending}
         className="gap-2"
         onClick={(e) => {
            e.preventDefault();
            mutate();
         }}
      >
         Log out
         {isPending ? (
            <Loader2 className="ml-auto size-4 shrink-0 animate-spin opacity-70" />
         ) : (
            <LogOut className="ml-auto size-4 shrink-0 opacity-70" />
         )}
      </DropdownMenuItem>
   );
}

export function SidebarTrigger({ className }: { className?: string }) {
   const [open, setOpen] = useState<boolean>(false);

   return (
      <Button
         aria-expanded={open || undefined}
         intent="ghost"
         className={cn("group relative flex size-10 flex-col", className)}
         onClick={() => {
            setOpen((prev) => !prev);
         }}
      >
         <span className="absolute top-3 left-2.5 block h-0.5 w-5 rotate-0 rounded-full bg-gray-700 transition-all duration-200 group-aria-expanded:top-[19px] group-aria-expanded:rotate-45"></span>
         <span className="absolute bottom-3 left-2.5 block h-0.5 w-5 rotate-0 rounded-full bg-gray-700 transition-all duration-200 group-aria-expanded:bottom-[19px] group-aria-expanded:-rotate-45"></span>
      </Button>
   );
}

export { Sidebar, Sidebar as default };
