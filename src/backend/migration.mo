import Map "mo:core/Map";
import Nat "mo:core/Nat";

module {
  // Old types are identical, so we can reuse them directly.
  type Product = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
    imageBase64 : Text;
  };

  type OldActor = {
    products : Map.Map<Nat, Product>;
    productIdCounter : Nat;
  };

  type NewActor = {
    products : Map.Map<Nat, Product>;
    productIdCounter : Nat;
  };

  // Migration function called by the main actor via the with-clause.
  public func run(old : OldActor) : NewActor {
    old;
  };
};

