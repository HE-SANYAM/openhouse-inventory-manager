import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { onLoginRequested } from "@/const";
import { trpc } from "@/lib/trpc";

export function PasswordLoginModal() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const utils = trpc.useUtils();

  useEffect(() => onLoginRequested(() => setOpen(true)), []);

  const loginMutation = trpc.auth.passwordLogin.useMutation({
    onSuccess: async () => {
      setPassword("");
      setOpen(false);
      await utils.auth.me.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Incorrect password");
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="w-[360px]">
        <DialogTitle>Sign in</DialogTitle>
        <DialogDescription>Enter the app password to continue.</DialogDescription>
        <form
          onSubmit={e => {
            e.preventDefault();
            if (password) loginMutation.mutate({ password });
          }}
          className="flex flex-col gap-3"
        >
          <Input
            type="password"
            autoFocus
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <DialogFooter>
            <Button type="submit" disabled={loginMutation.isPending || !password} className="w-full">
              {loginMutation.isPending ? "Signing in..." : "Sign in"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
