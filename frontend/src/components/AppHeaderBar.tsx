interface AppHeaderBarProps {
  title: string;
  subtitle: string;
  sessionLabel: string | null;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  onLogout?: () => void;
}

export const AppHeaderBar = ({
  title,
  subtitle,
  sessionLabel,
  theme,
  onToggleTheme,
  onLogout
}: AppHeaderBarProps) => {
  return (
    <header className="app-header">
      <div>
        <p className="eyebrow">Operacion en linea</p>
        <h2>{title}</h2>
        <p className="app-header__subtitle">{subtitle}</p>
      </div>

      <div className="app-header__actions">
        <span className="header-chip" aria-label="Notificaciones">◌</span>
        <button
          type="button"
          className="header-chip theme-toggle"
          aria-label={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
          onClick={onToggleTheme}
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        {sessionLabel ? <span className="header-badge">{sessionLabel}</span> : null}
        {onLogout ? (
          <button type="button" className="header-button" onClick={onLogout}>
            Cerrar sesion
          </button>
        ) : null}
      </div>
    </header>
  );
};
