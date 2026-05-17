import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { queryClient } from "./query-client.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme
        appearance="dark"
        accentColor="jade"
        grayColor="slate"
        radius="medium"
        panelBackground="translucent"
      >
        <App />
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
