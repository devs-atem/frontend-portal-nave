import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, User, LogOut } from "lucide-react";

import { useAuth } from "@core/auth/AuthContext";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import { useIoC } from "@shared/hooks/useIoC";
import type { ClienteFiltro } from "@features/inicio/services/ArmazenagemService";
import "./AppBarRight.css";

interface AppBarRightProps {
  /** Quantidade de notificações não lidas (badge do sino). */
  notificationCount?: number;
}

/** Iniciais a partir do nome completo (ex: "Helena Barros" -> "HB"). */
const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Bloco do canto superior direito da AppBar: seletor de cliente ativo,
 * sino de notificações e identificação do usuário. Segue a paleta Navemazônia.
 */
export const AppBarRight = ({ notificationCount = 0 }: AppBarRightProps) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const { cliente, setCliente } = useClienteAtivo();
  const armazenagem = useIoC("armazenagem");
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  const clientes = armazenagem.clientes;
  const perfil = auth.adminMode ? "Administrador" : "Usuário";

  // Fecha o dropdown do usuário ao clicar fora.
  useEffect(() => {
    if (!userMenuOpen) return;
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [userMenuOpen]);

  const clienteLabel = useMemo(() => {
    if (cliente === "all") return "Todos os clientes";
    return clientes.find((c) => c.id === cliente)?.razao ?? "Cliente";
  }, [cliente, clientes]);

  const handleSelect = (value: ClienteFiltro) => {
    setCliente(value);
    setMenuOpen(false);
  };

  return (
    <div className="nm-appbar">
      {/* Seletor de cliente ativo */}
      <div className="nm-appbar__cliente">
        <button
          type="button"
          className="nm-appbar__cliente-trigger"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
        >
          <span className="nm-appbar__cliente-info">
            <span className="nm-appbar__cliente-label">Cliente ativo</span>
            <span className="nm-appbar__cliente-value">{clienteLabel}</span>
          </span>
          <span className="nm-appbar__cliente-caret" aria-hidden="true">
            ▾
          </span>
        </button>

        {menuOpen && (
          <ul className="nm-appbar__cliente-menu" role="listbox">
            <li role="option" aria-selected={cliente === "all"}>
              <button type="button" onClick={() => handleSelect("all")}>
                Todos os clientes
              </button>
            </li>
            {clientes.map((c) => (
              <li key={c.id} role="option" aria-selected={cliente === c.id}>
                <button type="button" onClick={() => handleSelect(c.id)}>
                  {c.razao}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Sino de notificações */}
      <button
        type="button"
        className="nm-appbar__bell"
        aria-label={`Notificações${notificationCount ? `: ${notificationCount} não lidas` : ""}`}
      >
        <Bell size={20} aria-hidden="true" />
        {notificationCount > 0 && (
          <span className="nm-appbar__badge">{notificationCount}</span>
        )}
      </button>

      {/* Usuário */}
      <div className="nm-appbar__user" ref={userRef}>
        <button
          type="button"
          className={`nm-appbar__user-trigger${userMenuOpen ? " is-open" : ""}`}
          onClick={() => setUserMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={userMenuOpen}
        >
          <span className="nm-appbar__avatar" aria-hidden="true">
            {initialsOf(auth.name)}
          </span>
          <span className="nm-appbar__user-info">
            <span className="nm-appbar__user-name">{auth.name}</span>
            <span className="nm-appbar__user-role">{perfil}</span>
          </span>
        </button>

        {userMenuOpen && (
          <div className="nm-appbar__user-menu" role="menu">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setUserMenuOpen(false);
                navigate("/perfil");
              }}
            >
              <User size={16} aria-hidden="true" />
              Meu perfil
            </button>
            <button
              type="button"
              role="menuitem"
              className="nm-appbar__user-menu-danger"
              onClick={() => {
                setUserMenuOpen(false);
                void auth.logout();
              }}
            >
              <LogOut size={16} aria-hidden="true" />
              Sair
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AppBarRight;
