import { Button, Typography } from "@devs-atem/design-system";
import { useNavigate } from "react-router-dom";

export const NotFoundPage = () => {
  const navigate = useNavigate();

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
      <Typography.H1 style={{ fontSize: "4rem" }}>404</Typography.H1>
      <Typography.Body>A página que você procura não existe.</Typography.Body>
      <Button onClick={() => navigate("/")}>Voltar para o início</Button>
    </div>
  );
};

export default NotFoundPage;
