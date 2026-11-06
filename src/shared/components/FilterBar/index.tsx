import type { ReactNode } from "react";
import "./FilterBar.css";

interface FilterBarProps {
  /** Controles de filtro (Input de busca, Selects…), dispostos em linha. */
  children: ReactNode;
}

/**
 * Barra de filtros padrão do portal: um contêiner branco com borda arredondada
 * que dispõe os controles em uma única linha horizontal. Mantém a aparência
 * consistente entre os módulos (mesma usada na página de Produtos).
 *
 * Uso:
 * ```tsx
 * <FilterBar>
 *   <Input size="sm" leadingIcon={<Search size={16} />} ... style={{ flex: "1 1 0", minWidth: 0 }} />
 *   <Select size="sm" ... style={{ flex: "0 0 200px" }} />
 * </FilterBar>
 * ```
 */
export const FilterBar = ({ children }: FilterBarProps) => {
  return <div className="nm-filterbar">{children}</div>;
};

export default FilterBar;
