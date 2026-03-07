import type { Order, backendInterface } from "../backend.d";
import type {
  Payment,
  RiderAssignment,
  RiderProfile,
  StatementEntry,
  SubUser,
} from "./appTypes";

export interface ExtendedBackend extends backendInterface {
  addPayment(
    token: string,
    storeNumber: string,
    companyName: string,
    amount: number,
    paymentMethod: string,
    chequeDetails: string | null,
    utrDetails: string | null,
    paymentAdviceImage: string,
  ): Promise<void>;
  editPayment(
    token: string,
    paymentId: string,
    storeNumber: string,
    companyName: string,
    amount: number,
    paymentMethod: string,
    chequeDetails: string | null,
    utrDetails: string | null,
    paymentAdviceImage: string,
  ): Promise<void>;
  getAllPayments(token: string): Promise<Array<Payment>>;
  getPaymentsByStore(
    token: string,
    storeNumber: string,
  ): Promise<Array<Payment>>;
  deletePayment(
    token: string,
    paymentId: string,
    reason: string,
  ): Promise<void>;
  getCustomerStatement(
    token: string,
    storeNumber: string,
    fromTime: bigint,
    toTime: bigint,
  ): Promise<Array<StatementEntry>>;
  getCompanyStatement(
    token: string,
    fromTime: bigint,
    toTime: bigint,
  ): Promise<Array<StatementEntry>>;
  getMyStatement(
    token: string,
    fromTime: bigint,
    toTime: bigint,
  ): Promise<Array<StatementEntry>>;
  createSubUserWithPassword(
    token: string,
    email: string,
    password: string,
    roleText: string,
  ): Promise<void>;
  subUserLoginV2(email: string, password: string): Promise<string>;
  getAllSubUsers(token: string): Promise<Array<SubUser>>;
  toggleSubUser(token: string, email: string): Promise<void>;
  changeSubUserPassword(
    token: string,
    email: string,
    newPassword: string,
  ): Promise<void>;
  assignRider(
    token: string,
    orderId: string,
    riderEmail: string,
    riderName: string,
    riderPhone: string,
  ): Promise<void>;
  getRiderAssignment(
    token: string,
    orderId: string,
  ): Promise<RiderAssignment | null>;
  getAllRiderAssignments(token: string): Promise<Array<RiderAssignment>>;
  getOrdersForRider(token: string, riderEmail: string): Promise<Array<Order>>;
  saveRiderProfile(
    token: string,
    email: string,
    name: string,
    phone: string,
  ): Promise<void>;
  getRiderProfile(token: string, email: string): Promise<RiderProfile | null>;
  getAllRiderProfiles(token: string): Promise<Array<RiderProfile>>;
  updateOrderStatusRider(
    token: string,
    orderId: string,
    status: string,
  ): Promise<void>;
  getAllCustomerOrders(token: string): Promise<Array<Order>>;
  getAllCustomerPayments(token: string): Promise<Array<Payment>>;
  deleteOrder(token: string, orderId: string, reason: string): Promise<void>;
  markOrderDeliveredWithSignature(
    token: string,
    orderId: string,
    signatureData: string,
  ): Promise<void>;
  getAdminRole(token: string): Promise<string>;
  getAdminStatus(token: string): Promise<boolean>;
  setWebhookUrl(token: string, url: string): Promise<void>;
  getWebhookUrl(token: string): Promise<string>;
}
