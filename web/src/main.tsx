import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.tsx";
import "./index.css";
import { queryClient } from "./libs/query-client.ts";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Theme
        appearance="dark"
        accentColor="amber"
        grayColor="mauve"
        radius="large"
        panelBackground="translucent"
        scaling="100%"
        hasBackground={false}
      >
        <App />
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
);
