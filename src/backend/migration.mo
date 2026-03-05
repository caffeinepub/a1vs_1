import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  type OldOrder = {
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
  };

  type OldPayment = {
    paymentId : Text;
    storeNumber : Text;
    companyName : Text;
    amount : Float;
    paymentMethod : Text;
    chequeDetails : ?Text;
    utrDetails : ?Text;
    timestamp : Time.Time;
  };

  type OldActor = {
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Text, Customer>;
    orders : Map.Map<Text, OldOrder>;
    users : Map.Map<Text, UserRole>;
    subUsers : Map.Map<Text, SubUser>;
    payments : Map.Map<Text, OldPayment>;
    sessions : Map.Map<Text, SessionToken>;
    riderAssignments : Map.Map<Text, RiderAssignment>;
    riderProfiles : Map.Map<Text, RiderProfile>;
    productIdCounter : Nat;
    orderIdCounter : Nat;
    paymentIdCounter : Nat;
    passwordHash : Text;
    webhookUrl : Text;
  };

  type NewOrder = {
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

  type NewPayment = {
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

  type NewActor = {
    products : Map.Map<Nat, Product>;
    customers : Map.Map<Text, Customer>;
    orders : Map.Map<Text, NewOrder>;
    users : Map.Map<Text, UserRole>;
    subUsers : Map.Map<Text, SubUser>;
    payments : Map.Map<Text, NewPayment>;
    sessions : Map.Map<Text, SessionToken>;
    riderAssignments : Map.Map<Text, RiderAssignment>;
    riderProfiles : Map.Map<Text, RiderProfile>;
    productIdCounter : Nat;
    orderIdCounter : Nat;
    paymentIdCounter : Nat;
    passwordHash : Text;
    webhookUrl : Text;
  };

  type Product = {
    id : Nat;
    name : Text;
    active : Bool;
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

  public func run(old : OldActor) : NewActor {
    let orders = old.orders.map<Text, OldOrder, NewOrder>(
      func(_orderId, oldOrder) {
        { oldOrder with deliverySignature = null };
      }
    );
    let payments = old.payments.map<Text, OldPayment, NewPayment>(
      func(_paymentId, oldPayment) {
        {
          oldPayment with
          deleted = false;
          deleteReason = null;
        };
      }
    );
    { old with orders; payments };
  };
};
