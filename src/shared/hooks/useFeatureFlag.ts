import { useEffect, useState } from "react";
import flagsmith from "@flagsmith/flagsmith";

import { flagsmithEnabled } from "@core/config/featureFlags";

/**
 * Lê uma feature flag do Flagsmith sem depender do FlagsmithProvider montado.
 *
 * - Se `VITE_FLAGSMITH_ENV_ID` estiver vazio, retorna sempre `true` para o
 *   flag passado (comportamento "flagsmith desligado = tudo liberado").
 *   Isso permite rodar o template sem configurar o Flagsmith.
 *
 * - Caso contrário, usa o SDK global do flagsmith (inicializado pelo
 *   FlagsmithProvider em App.tsx) e reage a atualizações.
 */
export function useFeatureFlag(name: string | undefined): boolean {
  const [enabled, setEnabled] = useState(() => {
    if (!name) return true;
    if (!flagsmithEnabled) return true;
    return flagsmith.hasFeature(name);
  });

  useEffect(() => {
    if (!name || !flagsmithEnabled) return;

    const sync = () => setEnabled(flagsmith.hasFeature(name));
    sync();

    // flagsmith expõe listener. A assinatura pode mudar entre versões,
    // então encapsulamos defensivamente.
    const anyFlagsmith = flagsmith as unknown as {
      trigger?: (fn: () => void) => void;
      _trigger?: (fn: () => void) => void;
    };
    const originalTrigger = anyFlagsmith.trigger ?? anyFlagsmith._trigger;
    if (!originalTrigger) return;

    // Patch simples: a cada trigger do SDK, sincronizamos.
    const prev = originalTrigger.bind(flagsmith);
    anyFlagsmith.trigger = ((fn: () => void) => {
      sync();
      return prev(fn);
    }) as never;

    return () => {
      anyFlagsmith.trigger = prev as never;
    };
  }, [name]);

  return enabled;
}
