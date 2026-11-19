// @vitest-environment jsdom
import { useState } from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { buildRevisionInput, emptyItem, type ItemForm } from "../services/contractRules";
import { ItemsPanel, type ProductChoice } from "./ItemsPanel";

const products: ProductChoice[] = [
  { productId: "p1", name: "Óleo diesel S-10", sapCode: "100" },
  { productId: "p2", name: "Gasolina comum", sapCode: "200" },
  { productId: "p3", name: "Etanol hidratado", sapCode: "300" },
];

const complete = (productId: string, productCode: string): ItemForm => ({
  ...emptyItem(),
  included: true,
  productId,
  productCode,
  reservedCapacity: "1000.000",
  maximumCapacity: "1500.000",
  maximumQuota: "500.000",
  allowedMovementTypeCodes: ["ENTRADA"],
});

let latest: ItemForm[] = [];
const Harness = ({ initial = [] }: { initial?: ItemForm[] }) => {
  const [items, setItems] = useState(initial);
  const handleChange = (next: ItemForm[]) => {
    latest = next;
    setItems(next);
  };
  return <ItemsPanel items={items} onChange={handleChange} errors={{}} productChoices={products} />;
};

const list = () => screen.getByRole("list", { name: "Lista de itens" });

describe("ItemsPanel", () => {
  it("lista todos os produtos na ordem da API, sem badges de status", () => {
    render(
      <Harness initial={[complete("p1", "100"), { ...complete("p2", "200"), maximumQuota: "" }]} />,
    );
    const text = list().textContent ?? "";
    expect(text.indexOf("Óleo diesel S-10")).toBeLessThan(text.indexOf("Gasolina comum"));
    expect(text.indexOf("Gasolina comum")).toBeLessThan(text.indexOf("Etanol hidratado"));
    expect(screen.queryByText("Ativo")).toBeNull();
    expect(screen.queryByText("Rascunho")).toBeNull();
    expect(screen.queryByText("Não incluído")).toBeNull();
  });

  it("marcar cria o item e desmarcar o mantém fora do envio", () => {
    render(<Harness />);
    fireEvent.click(screen.getByLabelText("Incluir Gasolina comum"));
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({ productId: "p2", productCode: "200", included: true });
    fireEvent.click(screen.getByLabelText("Incluir Gasolina comum"));
    expect(latest[0].included).toBe(false);
    expect(
      buildRevisionInput({
        effectiveFrom: "2026-01-01",
        effectiveUntil: "",
        justification: "",
        items: latest,
      }).items,
    ).toEqual([]);
  });

  it("editar um campo de uma linha desmarcada marca a linha", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText(/Capacidade reservada/), { target: { value: "10" } });
    expect(latest).toHaveLength(1);
    expect(latest[0]).toMatchObject({ productId: "p1", included: true, reservedCapacity: "10" });
  });

  it("seleciona outra linha e mostra o detalhe do produto", () => {
    render(<Harness initial={[complete("p1", "100"), complete("p2", "200")]} />);
    const title = () => document.querySelector(".nm-items__detail-name")?.textContent;
    expect(title()).toBe("Óleo diesel S-10");
    fireEvent.click(screen.getByText("Gasolina comum"));
    expect(title()).toBe("Gasolina comum");
  });

  it("filtra a lista pela busca", () => {
    render(<Harness />);
    fireEvent.change(screen.getByLabelText("Buscar produto"), { target: { value: "gasol" } });
    expect(list().textContent).toContain("Gasolina comum");
    expect(list().textContent).not.toContain("Óleo diesel");
  });

  it("a aba de regras traz limite e tipos de movimento", () => {
    render(<Harness initial={[complete("p1", "100")]} />);
    fireEvent.click(screen.getByText("Regras de movimentação"));
    expect(screen.getByText("Limite de movimentação")).toBeTruthy();
    expect(screen.getByText("Tipos de movimento permitidos *")).toBeTruthy();
  });
});
