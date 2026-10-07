"use client";

// Same toasts as the reference (react-hot-toast, bottom-right, 5 s).
import { Toaster as HotToaster } from "react-hot-toast";
export { default as toast } from "react-hot-toast";

export function Toaster() {
  return <HotToaster position="bottom-right" toastOptions={{ duration: 5000 }} />;
}
