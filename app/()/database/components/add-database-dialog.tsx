"use client";

import Button from "@/app/components/ui/button";
import {
   Dialog,
   DialogBody,
   DialogClose,
   DialogContent,
   DialogFooter,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
} from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import Label from "@/app/components/ui/label";
import { Separator } from "@/app/components/ui/separator";
import { createDatabase, testDatabase } from "@/models/databases";
import DatabaseSchema, { CredentialsSchema, DatabaseInput, DatabaseOutput } from "@/validators/database";
import { useMutation } from "@tanstack/react-query";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { Controller, FieldErrors, FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Switch } from "@/app/components/ui/switch";
import { cn } from "@/lib/utils";

type Props = React.PropsWithChildren & {
   onSuccess?: () => unknown;
};

export default function AddDatabaseDialog({ children, onSuccess }: Props) {
   const { data: session } = useSession();
   const [open, setOpen] = useState<boolean>(false);

   const form = useForm<DatabaseOutput>({
      resolver: zodResolver(DatabaseSchema),
   });
   const {
      control,
      clearErrors,
      formState: { errors },
      getValues,
      handleSubmit,
      register,
      setValue,
      trigger,
      reset,
   } = form;

   const { mutate: test, isPending: isTesting } = useMutation({
      mutationKey: ["test-database-connection"],
      mutationFn: async (values: DatabaseInput) => {
         clearErrors();
         const safe = await DatabaseSchema.safeParseAsync(values);
         if (!safe.success && safe.error) {
            for (const issue of safe.error.issues) {
               if (issue.path.length <= 0) continue;
               if (issue.path?.[0] == "name") continue;
               trigger(issue.path.join(".") as keyof DatabaseOutput);
            }
         }

         const [, error] = await testDatabase(values);
         if (error) {
            toast.error(error.message);
            return;
         }
         toast.success("Sucessfully connected.");
      },
   });

   async function submit(data: DatabaseOutput) {
      const [, error] = await createDatabase(data);
      if (error) {
         toast.error(error.message);
         return;
      }

      await onSuccess?.();
      setOpen(false);
      reset();
   }

   function handleError(error: FieldErrors<DatabaseOutput>) {
      if (!session?.user) {
         toast.warning("You need to sign in first!");
         return;
      }
      const entries = Object.entries(error);
      if (entries.length <= 0) return;
      toast.error(`Error on field "${entries[0][0]}": ${entries[0][1].message}.`);
   }

   async function handlePaste() {
      const clipboard = await navigator.clipboard.readText();
      if (!clipboard) {
         toast.error("Clipboard is empty");
         return;
      }

      const matched = clipboard.match(
         // @ts-expect-error typescript doesn't understand the regex
         /(?<protocol>\w+(?=:\/{2}))?(?::\/{2})?(?<username>\w+?(?=:[^@\/]))\:(?<password>[^@]+?(?=@))(?:@)(?<host>.*?(?=\:|\/))(?<port>:\d+(?=\/))?(?:\/)(?<database>[^?]+(?=$|(\?.*)?))/,
      );
      if (!matched) {
         toast.error("URL doesn't match the expected pattern.");
         return;
      }

      if (matched?.groups?.protocol && !["postgresql", "postgres"].includes(matched?.groups?.protocol)) {
         toast.error("Not supported database protocol.");
         return;
      }

      const res: Record<string, unknown> = matched.groups ?? {};
      res["port"] = matched?.groups?.port?.replace(/[^0-9]/g, "") || "5432";
      res["ssl"] = clipboard?.includes("sslmode=require");

      const safe = await CredentialsSchema.safeParseAsync(res);
      if (!safe.success) {
         const issue = safe.error.issues[0];
         toast.error(
            "Invalid database credentials" +
               (process.env.NODE_ENV === "development" ? ` - ${issue.path.join(".")}: ${issue.message}` : ""),
         );
         return;
      }

      const entries = Object.entries(safe.data) as Array<
         [keyof typeof safe.data, (typeof safe.data)[keyof typeof safe.data]]
      >;
      entries.forEach(([key, value]) => {
         setValue(key, value);
      });
   }

   return (
      <Dialog open={open} onOpenChange={setOpen}>
         <DialogTrigger asChild>{children}</DialogTrigger>
         <DialogContent>
            <DialogHeader>
               <DialogTitle>Add database</DialogTitle>
            </DialogHeader>
            <DialogBody>
               <FormProvider {...form}>
                  <form className="flex flex-col gap-2 self-stretch" onSubmit={handleSubmit(submit, handleError)}>
                     {/* <div className="flex items-center gap-1 rounded-md bg-gray-200 p-1">
                        <span
                           aria-selected={true}
                           className="aria-selected:text-foreground aria-selected:bg-background inline-flex h-8 flex-1 items-center justify-center rounded-sm px-3 text-center text-sm text-gray-500 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-700"
                        >
                           Credentials
                        </span>
                        <span
                           aria-selected={false}
                           className="aria-selected:text-foreground aria-selected:bg-background inline-flex h-8 flex-1 items-center justify-center rounded-sm px-3 text-center text-sm text-gray-500 hover:cursor-pointer hover:bg-gray-100 hover:text-gray-700"
                        >
                           Advanced settings
                        </span>
                     </div> */}

                     <div className="grid grid-cols-1 gap-1">
                        <Label required>Name</Label>
                        <Input
                           placeholder={"My favorite database"}
                           {...register("name")}
                           className={
                              errors?.name
                                 ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                 : undefined
                           }
                        />
                     </div>

                     <Separator className="-mx-4 my-4" />

                     {/* <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-600">Credentials</span>
                        <div className="flex items-center gap-2">
                        </div>
                     </div> */}

                     <div className="col-span-full flex flex-1 items-center gap-2">
                        <div className="flex items-center gap-2">
                           <Controller
                              name="ssl"
                              control={control}
                              render={({ field }) => (
                                 <Switch
                                    disabled={field.disabled}
                                    onBlur={field.onBlur}
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    name={field.name}
                                    ref={field.ref}
                                 />
                              )}
                           />
                           <span className="text-sm">SSL</span>
                        </div>
                        <TooltipProvider delayDuration={0} disableHoverableContent>
                           <Tooltip>
                              <TooltipTrigger asChild>
                                 <Button intent="outline" size="icon" className="ml-auto size-8" onClick={handlePaste}>
                                    <span className="sr-only">Paste database url</span>
                                    <ClipboardPaste className="size-4 shrink-0" />
                                 </Button>
                              </TooltipTrigger>
                              <TooltipContent className="flex flex-col">
                                 <span className="text-background">Paste database URL</span>
                                 {/* <span className="text-background text-xs opacity-70">
                                          The database has to been in your clipboard
                                       </span> */}
                              </TooltipContent>
                           </Tooltip>
                        </TooltipProvider>
                     </div>

                     <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-4">
                        <div className="grid grid-cols-1 gap-1 sm:col-span-3">
                           <Label required>Host</Label>
                           <Input
                              {...register("host")}
                              className={
                                 errors?.host
                                    ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                    : undefined
                              }
                           />
                        </div>

                        <div className="grid grid-cols-1 gap-1">
                           <Label className="font-di text-sm text-gray-700">Port</Label>
                           <Input
                              placeholder="5432"
                              {...register("port")}
                              className={
                                 errors?.port
                                    ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                    : undefined
                              }
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 gap-1">
                        <Label required>Database</Label>
                        <Input
                           {...register("database")}
                           className={
                              errors?.database
                                 ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                 : undefined
                           }
                        />
                     </div>

                     <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="grid grid-cols-1 gap-1">
                           <Label required>Username</Label>
                           <Input
                              {...register("username")}
                              className={
                                 errors?.username
                                    ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                    : undefined
                              }
                           />
                        </div>

                        <div className="grid grid-cols-1 gap-1">
                           <Label required>Password</Label>
                           <Input
                              {...register("password")}
                              className={
                                 errors?.password
                                    ? "!border-red-500 !outline-red-500 dark:!border-red-600 dark:!outline-red-600"
                                    : undefined
                              }
                           />
                        </div>
                     </div>

                     <div className="-m-4 mt-2 border-t">
                        <DialogFooter className="flex-row justify-between">
                           <DialogClose asChild>
                              <Button disabled={isTesting} intent="ghost" className="max-xs:hidden">
                                 Cancel
                              </Button>
                           </DialogClose>

                           <Button
                              disabled={isTesting}
                              intent="outline"
                              className="xs:ml-auto relative overflow-hidden"
                              onClick={() => test(getValues())}
                           >
                              Test connection
                              {isTesting ? (
                                 <span className="absolute inset-0 grid place-items-center bg-[inherit]">
                                    <Loader2 className="size-4 shrink-0 animate-spin" />
                                 </span>
                              ) : null}
                           </Button>
                           <Button
                              disabled={isTesting}
                              type={"submit"}
                              intent="primary"
                              className={cn(
                                 "relative disabled:isolate disabled:cursor-not-allowed disabled:opacity-100",
                                 !session?.user ? "cursor-not-allowed opacity-70 select-none" : undefined,
                              )}
                           >
                              Submit
                              {isTesting && (
                                 <span className="absolute inset-0 grid size-full place-items-center rounded-[inherit] bg-inherit">
                                    <Loader2 className="size-4 shrink-0 animate-spin" />
                                 </span>
                              )}
                           </Button>
                        </DialogFooter>
                     </div>
                  </form>
               </FormProvider>
            </DialogBody>
         </DialogContent>
      </Dialog>
   );
}
