"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

type LoginRequiredDialogProps = {
  open: boolean;
  description: string;
  onOpenChange: (open: boolean) => void;
  onLogin: () => void;
};

function LoginRequiredDialog({
  open,
  description,
  onOpenChange,
  onLogin,
}: LoginRequiredDialogProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Login required"
      description={description}
    >
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" variant="accent" onClick={onLogin}>
          Login
        </Button>
      </div>
    </Modal>
  );
}

export { LoginRequiredDialog };
