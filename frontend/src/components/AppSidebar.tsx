import type { AccessRole } from "../types";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "settings";

interface AppSidebarProps {
  accessRole: AccessRole | null;
  activeSection: SidebarSection;
  onSelectSection: (section: SidebarSection) => void;
  sessionLabel: string | null;
}

const navItems: Array<{
  id: SidebarSection;
  label: string;
  icon: string;
}> = [
  { id: "dashboard", label: "Dashboard", icon: "▦" },
  { id: "fleet", label: "Flota", icon: "◫" },
  { id: "tasks", label: "Tareas", icon: "☰" },
  { id: "settings", label: "Ajustes", icon: "⚙" }
];

export const AppSidebar = ({
  accessRole,
  activeSection,
  onSelectSection,
  sessionLabel
}: AppSidebarProps) => {
  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand__mark">GR</div>
        <div>
          <p className="eyebrow">Centro de control</p>
          <h1>GRIDROBOT</h1>
          <p className="sidebar-brand__caption">Simulation Lead</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegacion principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-nav__item${activeSection === item.id ? " is-active" : ""}`}
            onClick={() => onSelectSection(item.id)}
          >
            <span className="sidebar-nav__icon">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-session">
        <div className="sidebar-session__avatar">OP</div>
        <div className="sidebar-session__content">
          <p className="eyebrow">Sesion actual</p>
          <strong>{sessionLabel ?? "Sin iniciar sesion"}</strong>
          <span>{accessRole === "central" ? "Acceso maestro" : accessRole === "operator" ? "Operacion remota" : "Pantalla de acceso"}</span>
        </div>
      </div>
    </aside>
  );
};
