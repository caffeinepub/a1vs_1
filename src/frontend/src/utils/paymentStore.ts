/**
 * @deprecated Payment storage has been migrated to the backend.
 * This file is kept for backward compatibility only.
 * All payment operations now use the backend actor APIs directly.
 */

export interface StoredPayment {
  paymentId: string;
  storeNumber: string;
  companyName: string;
  amount: number;
  paymentMethod: string;
  chequeDetails?: string | null;
  utrDetails?: string | null;
  paymentAdviceImage?: string;
  /** Unix timestamp in milliseconds */
  timestampMs: number;
  deleted: boolean;
  deleteReason?: string;
}

/** @deprecated Use actor.getAllPayments(token) instead */
export function getAllPayments(): StoredPayment[] {
  return [];
}

/** @deprecated Use actor.getPaymentsByStore(token, storeNumber) instead */
export function getPaymentsByStore(_storeNumber: string): StoredPayment[] {
  return [];
}

/** @deprecated Use actor.addPayment(...) instead */
export function addPayment(
  _storeNumber: string,
  _companyName: string,
  _amount: number,
  _paymentMethod: string,
  _chequeDetails?: string | null,
  _utrDetails?: string | null,
  _paymentAdviceImage?: string,
): StoredPayment {
  throw new Error("Use actor.addPayment() instead");
}

/** @deprecated Use actor.editPayment(...) instead */
export function editPayment(
  _paymentId: string,
  _storeNumber: string,
  _companyName: string,
  _amount: number,
  _paymentMethod: string,
  _chequeDetails?: string | null,
  _utrDetails?: string | null,
  _paymentAdviceImage?: string,
): void {
  throw new Error("Use actor.editPayment() instead");
}

/** @deprecated Use actor.softDeletePayment(...) instead */
export function deletePayment(_paymentId: string, _reason: string): void {
  throw new Error("Use actor.softDeletePayment() instead");
}

/** @deprecated */
export function toPayment(p: StoredPayment) {
  return {
    paymentId: p.paymentId,
    storeNumber: p.storeNumber,
    companyName: p.companyName,
    amount: p.amount,
    paymentMethod: p.paymentMethod,
    chequeDetails: p.chequeDetails ?? undefined,
    utrDetails: p.utrDetails ?? undefined,
    paymentAdviceImage: p.paymentAdviceImage ?? "",
    timestamp: BigInt(p.timestampMs) * 1_000_000n,
    deleted: p.deleted,
    deleteReason: p.deleteReason,
  };
}
