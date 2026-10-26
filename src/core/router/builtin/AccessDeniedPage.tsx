import { Button, Typography } from "@devs-atem/design-system";
import { useNavigate, useSearchParams } from "react-router-dom";

const REASONS: Record<string, string> = {
  forbidden: "Você não tem permissão para acessar esse recurso.",
  "customer-portfolio":
    "Sua carteira de clientes não dá acesso a esse recurso.",
};

export const AccessDeniedPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reason = params.get("reason") ?? "";
  const message = REASONS[reason] ?? "Acesso negado.";

  return (
    <div
      style={{
        display: "grid",
        placeItems: "center",
        minHeight: "60vh",
        padding: "2rem",
        textAlign: "center",
        gap: "1rem",
      }}
    >
      <Typography.H1>Acesso negado</Typography.H1>
      <Typography.Body>{message}</Typography.Body>
      <Button onClick={() => navigate("/")}>Voltar para o início</Button>
    </div>
  );
};

export default AccessDeniedPage;
