import type { AccessRole } from "../types";

type SidebarSection = "dashboard" | "fleet" | "tasks" | "robots" | "operators" | "settings";

interface AppSidebarProps {
  accessRole: AccessRole | null;
  activeSection: SidebarSection;
  onSelectSection: (section: SidebarSection) => void;
  sessionLabel: string | null;
}

const baseNavItems: Array<{
  id: SidebarSection;
  label: string;
  icon: string;
}> = [
  { id: "dashboard", label: "Resumen", icon: "▦" },
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
  const navItems =
    accessRole === "central"
      ? [
          ...baseNavItems.slice(0, 3),
          { id: "robots" as const, label: "Robots", icon: "▣" },
          { id: "operators" as const, label: "Operadores", icon: "⌘" },
          baseNavItems[3]!
        ]
      : baseNavItems;

  return (
    <aside className="app-sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand__mark">GR</div>
        <div>
          <p className="eyebrow">Centro de control</p>
          <h1>GRIDROBOT</h1>
          <p className="sidebar-brand__caption">Operación principal</p>
        </div>
      </div>

      <nav className="sidebar-nav" aria-label="Navegación principal">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`sidebar-nav__item${activeSection === item.id ? " is-active" : ""}`}
            aria-current={activeSection === item.id ? "page" : undefined}
            aria-label={`Ir a ${item.label}`}
            onClick={() => onSelectSection(item.id)}
          >
            <span className="sidebar-nav__icon">{item.icon}</span>
            <span className="sidebar-nav__label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-session">
        <div className="sidebar-session__avatar">OP</div>
        <div className="sidebar-session__content">
          <p className="eyebrow">Sesión actual</p>
          <strong>{sessionLabel ?? "Sin iniciar sesión"}</strong>
          <span>{accessRole === "central" ? "Acceso maestro" : accessRole === "operator" ? "Operación remota" : "Pantalla de acceso"}</span>
        </div>
      </div>
    </aside>
  );
};
