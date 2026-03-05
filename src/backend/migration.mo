import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  // Copy all existing types from the original actor
  type Product = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
  };

  type ProductInput = {
    name : Text;
    unit : Text;
    rate : Float;
  };

  type Customer = {
    storeNumber : Text;
    name : Text;
    phone : Text;
    companyName : Text;
    address : Text;
    gstNumber : ?Text;
    email : Text;
    password : Text;
  };

  type OrderItem = {
    productId : Nat;
    productName : Text;
    qty : Nat;
    rate : Float;
    unit : Text;
  };

  type Order = {
    orderId : Text;
    storeNumber : Text;
    companyName : Text;
    address : Text;
    items : [OrderItem];
    timestamp : Time.Time;
    status : Text;
    totalAmount : Float;
    invoiceNumber : ?Text;
    paymentMethod : Text;
    poNumber : Text;
    gstNumber : ?Text;
    deleteReason : ?Text;
    deliverySignature : ?Text;
  };

  type Payment = {
    paymentId : Text;
    storeNumber : Text;
    companyName : Text;
    amount : Float;
    paymentMethod : Text;
    chequeDetails : ?Text;
    utrDetails : ?Text;
    timestamp : Time.Time;
    deleted : Bool;
    deleteReason : ?Text;
  };

  type UserRole = { #admin; #manager; #accounts };

  type SubUser = {
    email : Text;
    password : Text;
    roleText : Text;
    active : Bool;
  };

  type SessionToken = {
    token : Text;
    role : ?UserRole;
    storeNumber : ?Text;
    expiry : Time.Time;
  };

  type StatementEntry = {
    entryDate : Time.Time;
    entryType : Text;
    referenceNumber : Text;
    companyName : Text;
    storeNumber : Text;
    debit : Float;
    credit : Float;
  };

  type RiderAssignment = {
    orderId : Text;
    riderEmail : Text;
    riderName : Text;
    riderPhone : Text;
  };

  type RiderProfile = {
    email : Text;
    name : Text;
    phone : Text;
  };

  type CompanyProfile = {
    gstNumber : Text;
    contactPhone : Text;
    contactEmail : Text;
    address : Text;
    logoBase64 : Text;
  };

  // Old actor type (without companyProfile field)
  type OldActor = {
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Text, Customer>;
    orders : Map.Map<Text, Order>;
    users : Map.Map<Text, UserRole>;
    subUsers : Map.Map<Text, SubUser>;
    payments : Map.Map<Text, Payment>;
    sessions : Map.Map<Text, SessionToken>;
    riderAssignments : Map.Map<Text, RiderAssignment>;
    riderProfiles : Map.Map<Text, RiderProfile>;
    productIdCounter : Nat;
    orderIdCounter : Nat;
    paymentIdCounter : Nat;
    passwordHash : Text;
    webhookUrl : Text;
  };

  // New actor type (with companyProfile field)
  type NewActor = {
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Text, Customer>;
    orders : Map.Map<Text, Order>;
    users : Map.Map<Text, UserRole>;
    subUsers : Map.Map<Text, SubUser>;
    payments : Map.Map<Text, Payment>;
    sessions : Map.Map<Text, SessionToken>;
    riderAssignments : Map.Map<Text, RiderAssignment>;
    riderProfiles : Map.Map<Text, RiderProfile>;
    companyProfile : CompanyProfile;
    productIdCounter : Nat;
    orderIdCounter : Nat;
    paymentIdCounter : Nat;
    passwordHash : Text;
    webhookUrl : Text;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      companyProfile = {
        gstNumber = "";
        contactPhone = "";
        contactEmail = "";
        address = "";
        logoBase64 = "";
      };
    };
  };
};
