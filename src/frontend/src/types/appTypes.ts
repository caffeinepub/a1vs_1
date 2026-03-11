/**
 * Extended types that are used by the frontend but are NOT in the generated backend.d.ts.
 * These types must match exactly what the Motoko backend returns.
 */
import type { Time } from "../backend.d";

export interface Payment {
  paymentId: string;
  storeNumber: string;
  companyName: string;
  amount: number;
  paymentMethod: string;
  chequeDetails?: string;
  utrDetails?: string;
  paymentAdviceImage?: string;
  timestamp: Time;
  deleted: boolean;
  deleteReason?: string;
}

export interface StatementEntry {
  entryDate: Time;
  entryType: string;
  referenceNumber: string;
  description: string;
  debit: number;
  credit: number;
  storeNumber: string;
  companyName: string;
}

export interface SubUser {
  email: string;
  role: string;
  /** roleText is an alias/alternative field name used in some contexts */
  roleText: string;
  active: boolean;
  name?: string;
  phone?: string;
  designation?: string;
}

export interface RiderAssignment {
  orderId: string;
  riderEmail: string;
  riderName: string;
  riderPhone: string;
  assignedAt?: Time;
}

export interface RiderProfile {
  email: string;
  name: string;
  phone: string;
}
