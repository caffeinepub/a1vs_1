import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  // Old types matching previous implementation
  type OldOrder = {
    orderId : Text;
    storeNumber : Text;
    companyName : Text;
    address : Text;
    items : [OldOrderItem];
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

  type OldOrderItem = {
    productId : Nat;
    productName : Text;
    qty : Nat;
    rate : Float;
    unit : Text;
  };

  type OldActor = {
    orders : Map.Map<Text, OldOrder>;
  };

  // New order type with explicit fields
  type NewOrder = {
    orderId : Text;
    storeNumber : Text;
    companyName : Text;
    address : Text;
    items : [NewOrderItem];
    timestamp : Time.Time;
    status : Text;
    totalAmount : Float;
    invoiceNumber : ?Text;
    paymentMethod : Text;
    poNumber : Text;
    gstNumber : ?Text;
    deleteReason : ?Text;
    deliverySignature : ?Text;
    deliverySignedAt : ?Time.Time;
    deliveryStartTime : ?Time.Time;
    deliveryEndTime : ?Time.Time;
  };

  type NewOrderItem = {
    productId : Nat;
    productName : Text;
    qty : Nat;
    rate : Float;
    unit : Text;
  };

  type NewActor = {
    orders : Map.Map<Text, NewOrder>;
  };

  public func run(old : OldActor) : NewActor {
    let newOrders = old.orders.map<Text, OldOrder, NewOrder>(
      func(orderId, oldOrder) {
        {
          orderId = oldOrder.orderId;
          storeNumber = oldOrder.storeNumber;
          companyName = oldOrder.companyName;
          address = oldOrder.address;
          items = oldOrder.items.map(
            func(oldItem) {
              {
                productId = oldItem.productId;
                productName = oldItem.productName;
                qty = oldItem.qty;
                rate = oldItem.rate;
                unit = oldItem.unit;
              };
            }
          );
          timestamp = oldOrder.timestamp;
          status = oldOrder.status;
          totalAmount = oldOrder.totalAmount;
          invoiceNumber = oldOrder.invoiceNumber;
          paymentMethod = oldOrder.paymentMethod;
          poNumber = oldOrder.poNumber;
          gstNumber = oldOrder.gstNumber;
          deleteReason = oldOrder.deleteReason;
          deliverySignature = oldOrder.deliverySignature;
          deliverySignedAt = null;
          deliveryStartTime = null;
          deliveryEndTime = null;
        };
      }
    );
    { orders = newOrders };
  };
};
