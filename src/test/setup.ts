/**
 * Setup global do Vitest.
 * Adicione aqui mocks que precisam valer pra todos os testes.
 */

if (typeof window !== "undefined" && !window.matchMedia) {
  // jsdom não implementa matchMedia por padrão
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}
