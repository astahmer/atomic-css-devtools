import * as Toast from "#components/toast";
import { createToaster } from "@ark-ui/react/toast";

export const [Toaster, toast] = createToaster({
    placement: "top-end",
    duration: 600,
    max: 1,
    pauseOnPageIdle: false,

    render(toast) {
      return (
        <Toast.Root onClick={toast.dismiss} p="10px">
          <Toast.Title fontSize="12px">{toast.title}</Toast.Title>
          <Toast.Description>{toast.description}</Toast.Description>
          <Toast.CloseTrigger asChild>
            <IconButton size="sm" variant="link">
              <XIcon />
            </IconButton>
          </Toast.CloseTrigger>
        </Toast.Root>
      );
    },
  });
