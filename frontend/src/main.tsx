import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";
import "./styles.css";
import { GamePage } from "./views/GamePage";

const RouterShell = () => {
  const [pathname, setPathname] = useState(window.location.pathname);

  useEffect(() => {
    const handleNavigation = () => {
      setPathname(window.location.pathname);
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, []);

  return pathname.startsWith("/game") ? <GamePage /> : <App currentPath={pathname} />;
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RouterShell />
  </StrictMode>
);
