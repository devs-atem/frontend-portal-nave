import { Select } from "@devs-atem/design-system";

import { useIoC } from "@shared/hooks/useIoC";
import { useClienteAtivo } from "@shared/hooks/useClienteAtivo";
import type { ClienteFiltro } from "@features/dashboard/services/ArmazenagemService";

interface ClienteSelectorProps {
  /** Permite a opção "Todos os clientes" (visão operador). */
  allowAll?: boolean;
}

/** Seletor de cliente ativo, usado no cabeçalho das telas. */
export const ClienteSelector = ({ allowAll = true }: ClienteSelectorProps) => {
  const svc = useIoC("armazenagem");
  const { cliente, setCliente } = useClienteAtivo();

  const options: ClienteFiltro[] = [
    ...(allowAll ? (["all"] as ClienteFiltro[]) : []),
    ...svc.clientes.map((c) => c.id),
  ];

  const label = (c: ClienteFiltro) =>
    c === "all" ? "Todos os clientes" : svc.cli(c).razao;

  return (
    <Select<ClienteFiltro>
      value={cliente}
      options={options.map((option) => ({ option }))}
      getOptionItemLabel={label}
      getSelectedOptionLabel={label}
      getOptionKey={(c) => String(c)}
      onChange={(c) => setCliente(c)}
      size="sm"
    />
  );
};

export default ClienteSelector;
