import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@devs-atem/design-system";

import { useAuth } from "@core/auth/AuthContext";
import { useMenuItems } from "@shared/hooks/useMenuItems";
import { modules } from "@core/router/modules";
import logoIcon from "@assets/brand/logo-icon.png";
import { AppBarRight } from "./AppBarRight";
import "./Shell.css";

/**
 * Shell = Sidebar (com AppBar embutida) + conteúdo roteado.
 *
 * Os itens do menu vêm dos próprios `module.tsx` de cada feature,
 * descobertos em `@core/router/modules`. O hook `useMenuItems` cuida
 * de ordenar e filtrar por permissão/flag.
 *
 * O bloco do canto superior direito (cliente ativo, notificações, usuário) é
 * renderizado por `AppBarRight`, posicionado sobre a topbar do Sidebar — o
 * componente do design system não expõe um slot livre para esse conteúdo.
 */
export const Shell = () => {
  const auth = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const items = useMenuItems(modules);

  return (
    <div className="nm-shell">
      <Sidebar
        items={items}
        activePath={location.pathname}
        onNavigate={(path) => navigate(path)}
        onLogout={() => void auth.logout()}
        header={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <img
              src={logoIcon}
              alt="Navemazônia"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
            <span
              style={{
                fontFamily: "Montserrat, sans-serif",
                fontWeight: 500,
                letterSpacing: "0.16em",
                fontSize: 15,
                color: "#FFFFFF",
              }}
            >
              NAVEMAZÔNIA
            </span>
          </div>
        }
        content={<Outlet />}
      />
      <div className="nm-shell__appbar-right">
        <AppBarRight notificationCount={3} />
      </div>
    </div>
  );
};

export default Shell;
