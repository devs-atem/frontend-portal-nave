import { PageTitleCard, Card, Typography } from "@devs-atem/design-system";

import { useAuth } from "@core/auth/AuthContext";
import "./PerfilPage.css";

/** Iniciais a partir do nome (ex: "Helena Barros" -> "HB"). */
const initialsOf = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/**
 * Página "Meu perfil" — dados do usuário autenticado (somente leitura).
 * Segue a identidade visual Navemazônia.
 */
export const PerfilPage = () => {
  const auth = useAuth();
  const perfil = auth.adminMode ? "Administrador" : "Usuário";
  const roles = [...auth.roles];
  const modulos = auth.permissionSet.SYSTEM_MODULES ?? [];

  return (
    <div style={{ padding: "24px 28px", display: "flex", flexDirection: "column", gap: 18, maxWidth: 1100 }}>
      <PageTitleCard title="Meu perfil" subtitle="Seus dados de acesso no Portal da Nave" />

      {/* Cabeçalho com avatar */}
      <div className="nm-perfil__hero">
        <span className="nm-perfil__avatar" aria-hidden="true">
          {initialsOf(auth.name)}
        </span>
        <div className="nm-perfil__hero-info">
          <span className="nm-perfil__name">{auth.name}</span>
          <span className="nm-perfil__role">{perfil}</span>
          <span className="nm-perfil__email">{auth.email}</span>
        </div>
      </div>

      {/* Dados da conta */}
      <Card>
        <Card.Header>
          <Typography.H4>Dados da conta</Typography.H4>
        </Card.Header>
        <Card.Body>
          <dl className="nm-perfil__grid">
            <div>
              <dt>Nome</dt>
              <dd>{auth.name}</dd>
            </div>
            <div>
              <dt>E-mail</dt>
              <dd>{auth.email}</dd>
            </div>
            <div>
              <dt>Perfil</dt>
              <dd>{perfil}</dd>
            </div>
            <div>
              <dt>Identificador</dt>
              <dd className="nm-perfil__mono">{auth.subject}</dd>
            </div>
          </dl>
        </Card.Body>
      </Card>

      {/* Papéis */}
      <Card>
        <Card.Header>
          <Typography.H4>Papéis</Typography.H4>
        </Card.Header>
        <Card.Body>
          {roles.length === 0 ? (
            <Typography.Body>Nenhum papel atribuído.</Typography.Body>
          ) : (
            <div className="nm-perfil__chips">
              {roles.map((r) => (
                <span key={r} className="nm-perfil__chip">
                  {r}
                </span>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Módulos liberados */}
      <Card>
        <Card.Header>
          <Typography.H4>Acessos ({modulos.length})</Typography.H4>
        </Card.Header>
        <Card.Body>
          {modulos.length === 0 ? (
            <Typography.Body>
              {auth.adminMode
                ? "Modo administrador — acesso total."
                : "Nenhum módulo liberado."}
            </Typography.Body>
          ) : (
            <div className="nm-perfil__chips">
              {modulos.map((m) => (
                <span key={m} className="nm-perfil__chip nm-perfil__chip--muted">
                  {m}
                </span>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default PerfilPage;
