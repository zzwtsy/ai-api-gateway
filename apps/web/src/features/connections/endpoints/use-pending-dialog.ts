import { useState } from "react";

interface DialogEventDetails {
  readonly cancel: () => void;
}

export function usePendingDialog() {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const onOpenChange = (nextOpen: boolean, eventDetails: DialogEventDetails) => {
    if (!nextOpen && pending) {
      eventDetails.cancel();
      return;
    }
    setOpen(nextOpen);
  };

  return { onOpenChange, open, pending, setOpen, setPending };
}
