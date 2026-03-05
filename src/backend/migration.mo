import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";

module {
  type OldProduct = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
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
    deleted : Bool;
    deleteReason : ?Text;
  };

  type OldActor = {
    products : Map.Map<Nat, OldProduct>;
    payments : Map.Map<Text, OldPayment>;
  };

  type NewProduct = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
    imageBase64 : Text;
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
    paymentAdviceImage : Text;
  };

  type NewActor = {
    products : Map.Map<Nat, NewProduct>;
    payments : Map.Map<Text, NewPayment>;
  };

  public func run(old : OldActor) : NewActor {
    let newProducts = old.products.map<Nat, OldProduct, NewProduct>(
      func(_id, oldProduct) {
        { oldProduct with imageBase64 = "" };
      }
    );

    let newPayments = old.payments.map<Text, OldPayment, NewPayment>(
      func(_id, oldPayment) {
        { oldPayment with paymentAdviceImage = "" };
      }
    );

    { old with products = newProducts; payments = newPayments };
  };
};
