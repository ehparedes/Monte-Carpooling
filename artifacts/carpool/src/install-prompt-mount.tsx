import { createRoot } from "react-dom/client";
import InstallPrompt from "./components/install-prompt";

const el = document.createElement("div");
el.id = "install-prompt-root";
document.body.appendChild(el);
createRoot(el).render(<InstallPrompt />);
