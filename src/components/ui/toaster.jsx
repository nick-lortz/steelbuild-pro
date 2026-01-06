import { Toaster as Sonner } from "sonner";

export function Toaster({ ...props }) {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      {...props}
    />
  );
}