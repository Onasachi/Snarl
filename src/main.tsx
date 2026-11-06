import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme/base.css";
import "./theme/home.css";

const root = document.getElementById("root");
if (!root) throw new Error("no #root to mount into");

/**
 * The store frames are a development-only view: `?frames=1` to look at them, `&scale=1`
 * to render them at full size for capture. They are never in a production build.
 */
const params = new URLSearchParams(window.location.search);
const frames = import.meta.env.DEV && params.get("frames") === "1";

if (frames) {
  document.documentElement.dataset.theme = "night";
  void import("./frames/StoreFrames").then(({ StoreFrames }) => {
    createRoot(root).render(
      <StrictMode>
        <StoreFrames scale={Number(params.get("scale") ?? 0.25)} />
      </StrictMode>,
    );
  });
} else {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
