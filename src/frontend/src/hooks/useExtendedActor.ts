import type { ExtendedBackend } from "../types/extendedBackend";
import { useActor } from "./useActor";

/**
 * Returns the same actor as useActor but cast to ExtendedBackend,
 * which includes methods not yet declared in the generated backend.d.ts.
 */
export function useExtendedActor() {
  const result = useActor();
  return {
    ...result,
    actor: result.actor as unknown as ExtendedBackend | null,
  };
}
