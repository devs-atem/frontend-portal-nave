import { Toaster } from "sonner";

/**
 * Toaster global (Sonner). Fica no topo-direita, com cores ricas e
 * botão de fechar visível. Para disparar um toast:
 *
 * ```tsx
 * import { toast } from "sonner";
 * toast.success("Salvo!");
 * ```
 */
export function ToastProvider() {
  return <Toaster position="top-right" richColors closeButton />;
}

export default ToastProvider;
