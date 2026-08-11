import { OfflinePage } from "@pages/OfflinePage";
import { AppRouter } from "@routes";
import { BrowserRouter } from "react-router-dom";
import ApplicationProviders from "./ApplicationProviders";

export default function AuthenticatedApplication() {
  return (
    <BrowserRouter>
      <ApplicationProviders><AppRouter /></ApplicationProviders>
      <OfflinePage />
    </BrowserRouter>
  );
}
