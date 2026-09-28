import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Registro del Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => console.log("Service Worker registrado con éxito:", reg.scope))
      .catch((err) => console.warn("Error al registrar Service Worker:", err));
  });
}

createRoot(document.getElementById("root")!).render(<App />);
