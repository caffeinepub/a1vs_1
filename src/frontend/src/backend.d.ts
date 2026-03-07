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
export enum UserRole {
    manager = "manager",
    admin = "admin",
    accounts = "accounts"
}
export interface backendInterface {
    addCustomer(token: string, newCustomer: CustomerInput): Promise<void>;
    addCustomersOnly(token: string, customerList: Array<CustomerInput>): Promise<void>;
    adminLogin(email: string, password: string): Promise<string>;
    changeAdminPassword(token: string, newPassword: string): Promise<void>;
    createSubUser(token: string, email: string, role: UserRole): Promise<void>;
    customerLogin(storeNumber: string, password: string): Promise<string>;
    deleteCustomer(token: string, storeNumber: string): Promise<void>;
    editOrderItems(token: string, orderId: string, newItems: Array<OrderItem>): Promise<void>;
    getActiveProducts(): Promise<Array<Product>>;
    getAllCustomers(token: string): Promise<Array<Customer>>;
    getAllOrders(token: string): Promise<Array<Order>>;
    getAllProducts(_token: string): Promise<Array<Product>>;
    getAllProductsPublic(): Promise<Array<Product>>;
    getCompanyProfile(): Promise<CompanyProfile>;
    getCustomer(storeNumber: string): Promise<{
        storeNumber: string;
        gstNumber?: string;
        address: string;
        companyName: string;
    } | null>;
    getOrdersByStore(token: string, storeNumber: string): Promise<Array<Order>>;
    placeOrder(token: string, storeNumber: string, companyName: string, address: string, items: Array<OrderItem>): Promise<string>;
    placeOrderV2(token: string, storeNumber: string, companyName: string, address: string, gstNumber: string | null, items: Array<OrderItem>, paymentMethod: string): Promise<string>;
    replaceCustomers(token: string, customerList: Array<CustomerInput>): Promise<void>;
    replaceProducts(token: string, productNames: Array<string>): Promise<void>;
    replaceProductsWithDetails(token: string, items: Array<ProductInput>): Promise<void>;
    setAllProductsActive(token: string, active: boolean): Promise<void>;
    setCompanyProfile(token: string, profile: CompanyProfile): Promise<void>;
    subUserLogin(email: string, _password: string): Promise<string>;
    toggleCustomerActive(token: string, storeNumber: string): Promise<void>;
    toggleProduct(token: string, productId: bigint): Promise<void>;
    updateCustomer(token: string, storeNumber: string, updatedCustomer: CustomerInput): Promise<void>;
    updateOrderStatus(token: string, orderId: string, status: string): Promise<void>;
    updateProductImage(token: string, productId: bigint, imageBase64: string): Promise<void>;
    updateProductRate(token: string, productId: bigint, newRate: number): Promise<void>;
}
