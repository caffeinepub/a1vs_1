import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ProductInput {
    name: string;
    rate: number;
    unit: string;
}
export type Time = bigint;
export interface OrderItem {
    qty: bigint;
    rate: number;
    unit: string;
    productId: bigint;
    productName: string;
}
export interface StatementEntry {
    entryDate: Time;
    entryType: string;
    referenceNumber: string;
    storeNumber: string;
    credit: number;
    companyName: string;
    debit: number;
}
export interface SubUser {
    roleText: string;
    active: boolean;
    password: string;
    email: string;
}
export interface Payment {
    paymentMethod: string;
    storeNumber: string;
    utrDetails?: string;
    paymentId: string;
    timestamp: Time;
    companyName: string;
    amount: number;
    chequeDetails?: string;
}
export interface Order {
    status: string;
    paymentMethod: string;
    storeNumber: string;
    gstNumber?: string;
    orderId: string;
    invoiceNumber?: string;
    totalAmount: number;
    address: string;
    timestamp: Time;
    companyName: string;
    items: Array<OrderItem>;
    poNumber: string;
}
export interface Product {
    id: bigint;
    active: boolean;
    name: string;
    rate: number;
    unit: string;
}
export interface Customer {
    storeNumber: string;
    gstNumber?: string;
    password: string;
    name: string;
    email: string;
    address: string;
    companyName: string;
    phone: string;
}
export enum UserRole {
    manager = "manager",
    admin = "admin",
    accounts = "accounts"
}
export interface backendInterface {
    addPayment(token: string, storeNumber: string, companyName: string, amount: number, paymentMethod: string, chequeDetails: string | null, utrDetails: string | null): Promise<void>;
    adminLogin(email: string, password: string): Promise<string>;
    changeAdminPassword(token: string, newPassword: string): Promise<void>;
    changeSubUserPassword(token: string, email: string, newPassword: string): Promise<void>;
    createSubUser(token: string, email: string, role: UserRole): Promise<void>;
    createSubUserWithPassword(token: string, email: string, password: string, roleText: string): Promise<void>;
    customerLogin(storeNumber: string, password: string): Promise<string>;
    editOrderItems(token: string, orderId: string, newItems: Array<OrderItem>): Promise<void>;
    getActiveProducts(): Promise<Array<Product>>;
    getAllCustomers(token: string): Promise<Array<Customer>>;
    getAllOrders(token: string): Promise<Array<Order>>;
    getAllPayments(token: string): Promise<Array<Payment>>;
    getAllProducts(token: string): Promise<Array<Product>>;
    getAllSubUsers(token: string): Promise<Array<SubUser>>;
    getCompanyStatement(_token: string, _fromTime: bigint, _toTime: bigint): Promise<Array<StatementEntry>>;
    getCustomer(storeNumber: string): Promise<{
        storeNumber: string;
        gstNumber?: string;
        address: string;
        companyName: string;
    } | null>;
    getCustomerStatement(token: string, storeNumber: string, _fromTime: bigint, _toTime: bigint): Promise<Array<StatementEntry>>;
    getMyStatement(token: string, _fromTime: bigint, _toTime: bigint): Promise<Array<StatementEntry>>;
    getOrdersByStore(token: string, storeNumber: string): Promise<Array<Order>>;
    getPaymentsByStore(token: string, storeNumber: string): Promise<Array<Payment>>;
    placeOrder(token: string, storeNumber: string, companyName: string, address: string, items: Array<OrderItem>): Promise<string>;
    placeOrderV2(token: string, storeNumber: string, companyName: string, address: string, gstNumber: string | null, items: Array<OrderItem>, paymentMethod: string): Promise<string>;
    replaceCustomers(token: string, customerList: Array<Customer>): Promise<void>;
    replaceProducts(token: string, productNames: Array<string>): Promise<void>;
    replaceProductsWithDetails(token: string, items: Array<ProductInput>): Promise<void>;
    setWebhookUrl(token: string, url: string): Promise<void>;
    subUserLogin(email: string, _password: string): Promise<string>;
    subUserLoginV2(email: string, password: string): Promise<string>;
    toggleProduct(token: string, productId: bigint): Promise<void>;
    toggleSubUser(token: string, email: string): Promise<void>;
    updateOrderStatus(token: string, orderId: string, status: string): Promise<void>;
    updateProductRate(token: string, productId: bigint, newRate: number): Promise<void>;
}
