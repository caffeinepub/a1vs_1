import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Customer {
    active: boolean;
    storeNumber: string;
    gstNumber?: string;
    password: string;
    name: string;
    email: string;
    address: string;
    companyName: string;
    phone: string;
}
export interface ProductInput {
    name: string;
    rate: number;
    unit: string;
    imageBase64?: string;
}
export interface CompanyProfile {
    logoBase64: string;
    gstNumber: string;
    address: string;
    contactEmail: string;
    contactPhone: string;
}
export type Time = bigint;
export interface OrderItem {
    qty: bigint;
    rate: number;
    unit: string;
    productId: bigint;
    productName: string;
}
export interface Payment {
    deleted: boolean;
    paymentMethod: string;
    paymentAdviceImage: string;
    storeNumber: string;
    deleteReason?: string;
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
    deliverySignedAt?: Time;
    storeNumber: string;
    gstNumber?: string;
    deleteReason?: string;
    orderId: string;
    deliveryStartTime?: Time;
    invoiceNumber?: string;
    deliverySignature?: string;
    totalAmount: number;
    address: string;
    deliveryEndTime?: Time;
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
    imageBase64: string;
}
export interface CustomerInput {
    storeNumber: string;
    gstNumber?: string;
    password: string;
    name: string;
    email: string;
    address: string;
    companyName: string;
    phone: string;
}
export interface SubUser {
    email: string;
    roleText: string;
    active: boolean;
    name?: string;
    phone?: string;
}
export interface RiderProfile {
    email: string;
    name: string;
    phone: string;
}
export enum UserRole {
    manager = "manager",
    admin = "admin",
    accounts = "accounts"
}
export interface backendInterface {
    addCustomer(token: string, newCustomer: CustomerInput): Promise<void>;
    addCustomersOnly(token: string, customerList: Array<CustomerInput>): Promise<void>;
    addPayment(token: string, storeNumber: string, companyName: string, amount: number, paymentMethod: string, chequeDetails: string | null, utrDetails: string | null, paymentAdviceImage: string): Promise<string>;
    adminLogin(email: string, password: string): Promise<string>;
    changeAdminPassword(token: string, newPassword: string): Promise<void>;
    changeSubUserPassword(token: string, email: string, newPassword: string): Promise<void>;
    createSubUser(token: string, email: string, role: UserRole): Promise<void>;
    createSubUserWithPassword(token: string, email: string, password: string, roleText: string, name: string, phone: string): Promise<void>;
    customerLogin(storeNumber: string, password: string): Promise<string>;
    deleteCustomer(token: string, storeNumber: string): Promise<void>;
    deleteSubUser(token: string, email: string): Promise<void>;
    editOrderItems(token: string, orderId: string, newItems: Array<OrderItem>): Promise<void>;
    editPayment(token: string, paymentId: string, storeNumber: string, companyName: string, amount: number, paymentMethod: string, chequeDetails: string | null, utrDetails: string | null, paymentAdviceImage: string): Promise<void>;
    getActiveProducts(): Promise<Array<Product>>;
    getAllCustomers(token: string): Promise<Array<Customer>>;
    getAllOrders(token: string): Promise<Array<Order>>;
    getAllPayments(token: string): Promise<Array<Payment>>;
    getAllProducts(_token: string): Promise<Array<Product>>;
    getAllProductsPublic(): Promise<Array<Product>>;
    getAllRiderProfiles(token: string): Promise<Array<RiderProfile>>;
    getAllSubUsers(token: string): Promise<Array<SubUser>>;
    getCompanyProfile(): Promise<CompanyProfile>;
    getCustomer(storeNumber: string): Promise<{
        storeNumber: string;
        gstNumber?: string;
        address: string;
        companyName: string;
    } | null>;
    getOrdersByStore(token: string, storeNumber: string): Promise<Array<Order>>;
    getPaymentsByStore(token: string, storeNumber: string): Promise<Array<Payment>>;
    placeOrder(token: string, storeNumber: string, companyName: string, address: string, items: Array<OrderItem>): Promise<string>;
    placeOrderV2(token: string, storeNumber: string, companyName: string, address: string, gstNumber: string | null, items: Array<OrderItem>, paymentMethod: string): Promise<string>;
    replaceCustomers(token: string, customerList: Array<CustomerInput>): Promise<void>;
    replaceProducts(token: string, productNames: Array<string>): Promise<void>;
    replaceProductsWithDetails(token: string, items: Array<ProductInput>): Promise<Array<Product>>;
    saveRiderProfile(token: string, email: string, name: string, phone: string): Promise<void>;
    setAllProductsActive(token: string, active: boolean): Promise<void>;
    setCompanyProfile(token: string, profile: CompanyProfile): Promise<void>;
    softDeletePayment(token: string, paymentId: string, reason: string): Promise<void>;
    subUserLogin(email: string, password: string): Promise<string>;
    toggleCustomerActive(token: string, storeNumber: string): Promise<void>;
    toggleProduct(token: string, productId: bigint): Promise<void>;
    toggleSubUser(token: string, email: string): Promise<void>;
    updateCustomer(token: string, storeNumber: string, updatedCustomer: CustomerInput): Promise<void>;
    updateOrderStatus(token: string, orderId: string, status: string): Promise<void>;
    updateProductImage(token: string, productId: bigint, imageBase64: string): Promise<void>;
    updateProductRate(token: string, productId: bigint, newRate: number): Promise<void>;
}
