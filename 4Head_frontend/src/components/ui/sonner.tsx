import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * App-wide toast host (powered by `sonner`). Mounted once in providers.
 * Use `import { toast } from "sonner"` anywhere to fire a toast — never
 * build a bespoke toast UI in a feature folder.
 *
 * The light theme is explicit for now; dark-mode switching is intentionally
 * deferred with the rest of the optional dark-mode implementation.
 */
function Toaster(props: ToasterProps) {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
