import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./styles/tokens.css";
import "./styles/ui.css";
import "./styles/shell.css";
import "./styles/dashboard.css";
import "./styles/places.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element missing");
}
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
