import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Timer "mo:core/Timer";
import Float "mo:core/Float";
import Migration "migration";

// Instruct to run data migration on upgrade
(with migration = Migration.run)
actor {
  //---------------------
  // Types & Constants
  //---------------------
  type Product = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
    imageBase64 : Text;
  };

  module Product {
    public func compare(product1 : Product, product2 : Product) : Order.Order {
      Nat.compare(product1.id, product2.id);
    };
  };

  type ProductInput = {
    name : Text;
    unit : Text;
    rate : Float;
    imageBase64 : ?Text;
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

  module Customer {
    public func compare(customer1 : Customer, customer2 : Customer) : Order.Order {
      Text.compare(customer1.storeNumber, customer2.storeNumber);
    };
  };

  type OrderItem = {
    productId : Nat;
    productName : Text;
    qty : Nat;
    rate : Float;
    unit : Text;
  };

  module OrderItem {
    public func compare(orderItem1 : OrderItem, orderItem2 : OrderItem) : Order.Order {
      Nat.compare(orderItem1.productId, orderItem2.productId);
    };
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
    paymentAdviceImage : Text;
  };

  public type UserRole = { #admin; #manager; #accounts };

  module UserRole {
    public func toText(role : UserRole) : Text {
      switch (role) {
        case (#admin) { "admin" };
        case (#manager) { "manager" };
        case (#accounts) { "accounts" };
      };
    };
  };

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

  //---------------------
  // State
  //---------------------
  let products = Map.empty<Nat, Product>();
  let customers = Map.empty<Text, Customer>();
  let orders = Map.empty<Text, Order>();
  let users = Map.empty<Text, UserRole>();
  let subUsers = Map.empty<Text, SubUser>();
  let payments = Map.empty<Text, Payment>();
  let sessions = Map.empty<Text, SessionToken>();

  let riderAssignments = Map.empty<Text, RiderAssignment>();
  let riderProfiles = Map.empty<Text, RiderProfile>();

  var companyProfile : CompanyProfile = {
    gstNumber = "";
    contactPhone = "";
    contactEmail = "";
    address = "";
    logoBase64 = "";
  };

  var productIdCounter = 1;
  var orderIdCounter = 1;
  var paymentIdCounter = 1;
  var passwordHash = "Admin@1234";
  var webhookUrl = "";

  //---------------------
  // Helper Functions
  //---------------------
  func generateToken() : Text {
    let now = Time.now();
    return now.toText();
  };

  func validateSession(token : Text, requiredRole : ?UserRole) {
    switch (sessions.get(token)) {
      case (null) { Runtime.trap("Invalid session token") };
      case (?session) {
        let now = Time.now();
        if (now > session.expiry) { Runtime.trap("Session expired") };
        switch (requiredRole, session.role) {
          case (null, _) {};
          case (?req, ?actual) {
            if (req != actual) { Runtime.trap("Insufficient permissions") };
          };
          case (?_, null) { Runtime.trap("Session has no role, access denied") };
        };
      };
    };
  };

  func clearExpiredSessions() : async () {
    let now = Time.now();
    let expiredTokens = sessions.toArray().filter(func((token, session)) { session.expiry < now });
    for ((token, _session) in expiredTokens.values()) {
      sessions.remove(token);
    };
  };

  ignore Timer.recurringTimer<system>(
    #nanoseconds(24 * 3600 * 1000000000),
    clearExpiredSessions
  );

  //---------------------
  // New Company Profile APIs
  //---------------------
  public query ({ caller }) func getCompanyProfile() : async CompanyProfile {
    companyProfile;
  };

  public shared ({ caller }) func setCompanyProfile(token : Text, profile : CompanyProfile) : async () {
    validateSession(token, ?#admin);
    companyProfile := profile;
  };

  //---------------------
  // Admin Authentication
  //---------------------
  public shared ({ caller }) func adminLogin(email : Text, password : Text) : async Text {
    if (email != "form2.subway@gmail.com") { Runtime.trap("Invalid admin login") };
    if (password != passwordHash) { Runtime.trap("Invalid admin login") };

    let token = generateToken();
    let session : SessionToken = {
      token;
      role = ?#admin;
      storeNumber = null;
      expiry = Time.now() + (24 * 3600 * 1000000000);
    };
    sessions.add(token, session);
    token;
  };

  public shared ({ caller }) func changeAdminPassword(token : Text, newPassword : Text) : async () {
    validateSession(token, ?#admin);
    passwordHash := newPassword;
  };

  public shared ({ caller }) func createSubUser(token : Text, email : Text, role : UserRole) : async () {
    validateSession(token, ?#admin);
    if (users.containsKey(email)) { Runtime.trap("Email already exists") };
    users.add(email, role);
  };

  public shared ({ caller }) func subUserLogin(email : Text, _password : Text) : async Text {
    switch (users.get(email)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?role) {
        let token = generateToken();
        let session : SessionToken = {
          token;
          role = ?role;
          storeNumber = null;
          expiry = Time.now() + (24 * 3600 * 1000000000);
        };
        sessions.add(token, session);
        token;
      };
    };
  };

  //---------------------
  // Product Management
  //---------------------
  public shared ({ caller }) func replaceProducts(token : Text, productNames : [Text]) : async () {
    validateSession(token, ?#admin);
    products.clear();

    var idCounter = 1;
    for (name in productNames.values()) {
      let product : Product = { id = idCounter; name; active = true; unit = "KGS"; rate = 0.0; imageBase64 = "" };
      products.add(idCounter, product);
      idCounter += 1;
    };
  };

  public query ({ caller }) func getActiveProducts() : async [Product] {
    products.values().filter(func(product) { product.active }).toArray();
  };

  public shared ({ caller }) func toggleProduct(token : Text, productId : Nat) : async () {
    validateSession(token, ?#admin);
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let updatedProduct : Product = {
          id = product.id;
          name = product.name;
          active = not product.active;
          unit = product.unit;
          rate = product.rate;
          imageBase64 = product.imageBase64;
        };
        products.add(productId, updatedProduct);
      };
    };
  };

  public shared ({ caller }) func updateProductRate(token : Text, productId : Nat, newRate : Float) : async () {
    validateSession(token, ?#admin);
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let updatedProduct : Product = {
          id = product.id;
          name = product.name;
          active = product.active;
          unit = product.unit;
          rate = newRate;
          imageBase64 = product.imageBase64;
        };
        products.add(productId, updatedProduct);
      };
    };
  };

  public shared ({ caller }) func replaceProductsWithDetails(token : Text, items : [ProductInput]) : async () {
    validateSession(token, ?#admin);
    products.clear();

    var idCounter = 1;
    for (item in items.values()) {
      let product : Product = {
        id = idCounter;
        name = item.name;
        active = true;
        unit = item.unit;
        rate = item.rate;
        imageBase64 = switch (item.imageBase64) {
          case (null) { "" };
          case (?image) { image };
        };
      };
      products.add(idCounter, product);
      idCounter += 1;
    };
  };

  public query ({ caller }) func getAllProducts(token : Text) : async [Product] {
    validateSession(token, null);
    products.values().toArray();
  };

  //---------------------
  // New Product Image Handling API
  //---------------------
  public shared ({ caller }) func updateProductImage(token : Text, productId : Nat, imageBase64 : Text) : async () {
    validateSession(token, ?#admin);
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        let updatedProduct : Product = {
          id = product.id;
          name = product.name;
          active = product.active;
          unit = product.unit;
          rate = product.rate;
          imageBase64;
        };
        products.add(productId, updatedProduct);
      };
    };
  };

  //---------------------
  // Customer Management
  //---------------------
  public shared ({ caller }) func replaceCustomers(token : Text, customerList : [Customer]) : async () {
    validateSession(token, ?#admin);
    customers.clear();

    for (customer in customerList.values()) {
      customers.add(customer.storeNumber, customer);
    };
  };

  public shared ({ caller }) func customerLogin(storeNumber : Text, password : Text) : async Text {
    switch (customers.get(storeNumber)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?customer) {
        if (customer.password != password) { Runtime.trap("Invalid password") };

        let token = generateToken();
        let session : SessionToken = {
          token;
          role = null;
          storeNumber = ?storeNumber;
          expiry = Time.now() + (24 * 3600 * 1000000000);
        };
        sessions.add(token, session);
        token;
      };
    };
  };

  public query ({ caller }) func getCustomer(storeNumber : Text) : async ?{
    companyName : Text;
    address : Text;
    storeNumber : Text;
    gstNumber : ?Text;
  } {
    switch (customers.get(storeNumber)) {
      case (null) { null };
      case (?customer) {
        ?{
          companyName = customer.companyName;
          address = customer.address;
          storeNumber;
          gstNumber = customer.gstNumber;
        };
      };
    };
  };

  public shared ({ caller }) func getAllCustomers(token : Text) : async [Customer] {
    validateSession(token, ?#admin);
    customers.values().toArray();
  };

  public shared ({ caller }) func updateCustomer(token : Text, storeNumber : Text, updatedCustomer : Customer) : async () {
    validateSession(token, ?#admin);
    if (not customers.containsKey(storeNumber)) {
      Runtime.trap("Customer with store number does not exist");
    };
    customers.add(storeNumber, updatedCustomer);
  };

  //---------------------
  // Order Management
  //---------------------
  public shared ({ caller }) func placeOrder(token : Text, storeNumber : Text, companyName : Text, address : Text, items : [OrderItem]) : async Text {
    validateSession(token, null);

    let orderId = "A1VS-" # orderIdCounter.toText();
    let order : Order = {
      orderId;
      storeNumber;
      companyName;
      address;
      items;
      timestamp = Time.now();
      status = "pending";
      totalAmount = 0.0;
      gstNumber = null;
      invoiceNumber = null;
      paymentMethod = "cash_on_delivery";
      poNumber = orderId;
      deleteReason = null;
      deliverySignature = null;
    };

    orders.add(orderId, order);
    orderIdCounter += 1;

    if (webhookUrl != "") {};
    orderId;
  };

  public shared ({ caller }) func placeOrderV2(
    token : Text,
    storeNumber : Text,
    companyName : Text,
    address : Text,
    gstNumber : ?Text,
    items : [OrderItem],
    paymentMethod : Text,
  ) : async Text {
    validateSession(token, null);

    let orderId = "A1VS-" # orderIdCounter.toText();
    var totalAmount = 0.0;
    for (item in items.values()) {
      totalAmount += item.rate * item.qty.toFloat();
    };

    let order : Order = {
      orderId;
      storeNumber;
      companyName;
      address;
      items;
      timestamp = Time.now();
      status = "pending";
      totalAmount;
      invoiceNumber = null;
      paymentMethod;
      poNumber = orderId;
      gstNumber;
      deleteReason = null;
      deliverySignature = null;
    };

    orders.add(orderId, order);
    orderIdCounter += 1;

    if (webhookUrl != "") {};
    orderId;
  };

  public shared ({ caller }) func getAllOrders(token : Text) : async [Order] {
    validateSession(token, null);
    orders.values().toArray();
  };

  public shared ({ caller }) func getOrdersByStore(token : Text, storeNumber : Text) : async [Order] {
    validateSession(token, null);
    orders.values().filter(func(order) { order.storeNumber == storeNumber }).toArray();
  };

  public shared ({ caller }) func updateOrderStatus(token : Text, orderId : Text, status : Text) : async () {
    validateSession(token, null);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder : Order = {
          orderId = order.orderId;
          storeNumber = order.storeNumber;
          companyName = order.companyName;
          address = order.address;
          items = order.items;
          timestamp = order.timestamp;
          status;
          totalAmount = order.totalAmount;
          invoiceNumber = order.invoiceNumber;
          paymentMethod = order.paymentMethod;
          poNumber = order.poNumber;
          gstNumber = order.gstNumber;
          deleteReason = order.deleteReason;
          deliverySignature = order.deliverySignature;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func editOrderItems(token : Text, orderId : Text, newItems : [OrderItem]) : async () {
    validateSession(token, null);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?existingOrder) {
        var totalAmount = 0.0;
        for (item in newItems.values()) {
          totalAmount += item.rate * item.qty.toFloat();
        };

        let updatedOrder : Order = {
          orderId = existingOrder.orderId;
          storeNumber = existingOrder.storeNumber;
          companyName = existingOrder.companyName;
          address = existingOrder.address;
          items = newItems;
          timestamp = existingOrder.timestamp;
          status = existingOrder.status;
          totalAmount;
          invoiceNumber = existingOrder.invoiceNumber;
          paymentMethod = existingOrder.paymentMethod;
          poNumber = existingOrder.poNumber;
          gstNumber = existingOrder.gstNumber;
          deleteReason = existingOrder.deleteReason;
          deliverySignature = existingOrder.deliverySignature;
        };

        orders.add(orderId, updatedOrder);
      };
    };
  };

  //---------------------
  // New Order Deletion API
  //---------------------
  public shared ({ caller }) func deleteOrder(token : Text, orderId : Text, reason : Text) : async () {
    validateSession(token, null);
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder : Order = {
          orderId = order.orderId;
          storeNumber = order.storeNumber;
          companyName = order.companyName;
          address = order.address;
          items = order.items;
          timestamp = order.timestamp;
          status = "deleted";
          totalAmount = order.totalAmount;
          invoiceNumber = order.invoiceNumber;
          paymentMethod = order.paymentMethod;
          poNumber = order.poNumber;
          gstNumber = order.gstNumber;
          deleteReason = ?reason;
          deliverySignature = order.deliverySignature;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  //---------------------
  // New Mark Order Delivered With Signature API
  //---------------------
  public shared ({ caller }) func markOrderDeliveredWithSignature(token : Text, orderId : Text, signatureData : Text) : async () {
    validateSession(token, null);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder : Order = {
          orderId = order.orderId;
          storeNumber = order.storeNumber;
          companyName = order.companyName;
          address = order.address;
          items = order.items;
          timestamp = order.timestamp;
          status = "delivered";
          totalAmount = order.totalAmount;
          paymentMethod = order.paymentMethod;
          poNumber = order.poNumber;
          gstNumber = order.gstNumber;
          deleteReason = order.deleteReason;
          deliverySignature = ?signatureData;
          invoiceNumber = ?("INV-" # orderId);
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  // ---------------------
  // Payment Management
  // ---------------------
  public shared ({ caller }) func addPayment(
    token : Text,
    storeNumber : Text,
    companyName : Text,
    amount : Float,
    paymentMethod : Text,
    chequeDetails : ?Text,
    utrDetails : ?Text,
    paymentAdviceImage : Text,
  ) : async () {
    validateSession(token, ?#admin);

    let paymentId = "PAY-" # paymentIdCounter.toText();
    let payment : Payment = {
      paymentId;
      storeNumber;
      companyName;
      amount;
      paymentMethod;
      chequeDetails;
      utrDetails;
      timestamp = Time.now();
      deleted = false;
      deleteReason = null;
      paymentAdviceImage;
    };

    payments.add(paymentId, payment);
    paymentIdCounter += 1;
  };

  // ---------------------
  // Edit Payment API (new)
  // ---------------------
  public shared ({ caller }) func editPayment(
    token : Text,
    paymentId : Text,
    storeNumber : Text,
    companyName : Text,
    amount : Float,
    paymentMethod : Text,
    chequeDetails : ?Text,
    utrDetails : ?Text,
    paymentAdviceImage : Text,
  ) : async () {
    validateSession(token, ?#admin);

    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?existingPayment) { // Use existing value for deleted and deleteReason
        let updatedPayment : Payment = {
          paymentId;
          storeNumber;
          companyName;
          amount;
          paymentMethod;
          chequeDetails;
          utrDetails;
          timestamp = Time.now();
          deleted = existingPayment.deleted;
          deleteReason = existingPayment.deleteReason;
          paymentAdviceImage;
        };

        payments.add(paymentId, updatedPayment);
      };
    };
  };

  public shared ({ caller }) func getPaymentsByStore(token : Text, storeNumber : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().filter(func(payment) { payment.storeNumber == storeNumber and not payment.deleted }).toArray();
  };

  public shared ({ caller }) func getAllPayments(token : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().filter(func(payment) { not payment.deleted }).toArray();
  };

  //---------------------
  // New Delete Payment API
  //---------------------
  public shared ({ caller }) func deletePayment(token : Text, paymentId : Text, reason : Text) : async () {
    validateSession(token, ?#admin);
    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?payment) {
        let updatedPayment : Payment = {
          paymentId = payment.paymentId;
          storeNumber = payment.storeNumber;
          companyName = payment.companyName;
          amount = payment.amount;
          paymentMethod = payment.paymentMethod;
          chequeDetails = payment.chequeDetails;
          utrDetails = payment.utrDetails;
          timestamp = payment.timestamp;
          deleted = true;
          deleteReason = ?reason;
          paymentAdviceImage = payment.paymentAdviceImage;
        };
        payments.add(paymentId, updatedPayment);
      };
    };
  };

  //---------------------
  // Statement Generation
  //---------------------
  public shared ({ caller }) func getCustomerStatement(token : Text, storeNumber : Text, _fromTime : Int, _toTime : Int) : async [StatementEntry] {
    validateSession(token, null);
    let entries = List.empty<StatementEntry>();

    for (order in orders.values()) {
      if (order.storeNumber == storeNumber and order.status != "deleted") {
        entries.add(
          {
            entryDate = order.timestamp;
            entryType = "order";
            referenceNumber = order.orderId;
            companyName = order.companyName;
            storeNumber;
            debit = order.totalAmount;
            credit = 0.0;
          }
        );
      };
    };

    for (payment in payments.values()) {
      if (payment.storeNumber == storeNumber and not payment.deleted) {
        entries.add(
          {
            entryDate = payment.timestamp;
            entryType = "payment";
            referenceNumber = payment.paymentId;
            companyName = payment.companyName;
            storeNumber;
            debit = 0.0;
            credit = payment.amount;
          }
        );
      };
    };

    entries.toArray();
  };

  public shared ({ caller }) func getCompanyStatement(_token : Text, _fromTime : Int, _toTime : Int) : async [StatementEntry] {
    let entries = List.empty<StatementEntry>();

    for (order in orders.values()) {
      if (order.status != "deleted") {
        entries.add(
          {
            entryDate = order.timestamp;
            entryType = "order";
            referenceNumber = order.orderId;
            companyName = order.companyName;
            storeNumber = order.storeNumber;
            debit = order.totalAmount;
            credit = 0.0;
          }
        );
      };
    };

    for (payment in payments.values()) {
      if (not payment.deleted) {
        entries.add(
          {
            entryDate = payment.timestamp;
            entryType = "payment";
            referenceNumber = payment.paymentId;
            companyName = payment.companyName;
            storeNumber = payment.storeNumber;
            debit = 0.0;
            credit = payment.amount;
          }
        );
      };
    };

    entries.toArray();
  };

  public shared ({ caller }) func getMyStatement(token : Text, _fromTime : Int, _toTime : Int) : async [StatementEntry] {
    validateSession(token, null);
    switch (sessions.get(token)) {
      case (?session) {
        switch (session.storeNumber) {
          case (?storeNumber) {
            let entries = List.empty<StatementEntry>();
            for (order in orders.values()) {
              if (order.storeNumber == storeNumber and order.status != "deleted") {
                entries.add(
                  {
                    entryDate = order.timestamp;
                    entryType = "order";
                    referenceNumber = order.orderId;
                    companyName = order.companyName;
                    storeNumber;
                    debit = order.totalAmount;
                    credit = 0.0;
                  }
                );
              };
            };
            for (payment in payments.values()) {
              if (payment.storeNumber == storeNumber and not payment.deleted) {
                entries.add(
                  {
                    entryDate = payment.timestamp;
                    entryType = "payment";
                    referenceNumber = payment.paymentId;
                    companyName = payment.companyName;
                    storeNumber;
                    debit = 0.0;
                    credit = payment.amount;
                  }
                );
              };
            };
            entries.toArray();
          };
          case (null) { [] };
        };
      };
      case (null) { [] };
    };
  };

  //---------------------
  // Sub-User Management
  //---------------------
  public shared ({ caller }) func createSubUserWithPassword(
    token : Text,
    email : Text,
    password : Text,
    roleText : Text,
  ) : async () {
    validateSession(token, ?#admin);
    if (subUsers.containsKey(email)) { Runtime.trap("Email already exists") };

    let subUser : SubUser = {
      email;
      password;
      roleText;
      active = true;
    };
    subUsers.add(email, subUser);
  };

  public shared ({ caller }) func subUserLoginV2(email : Text, password : Text) : async Text {
    switch (subUsers.get(email)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?subUser) {
        if (subUser.password != password or not subUser.active) { Runtime.trap("Invalid credentials") };

        let role : ?UserRole = switch (subUser.roleText) {
          case ("storeManager") { ?#manager };
          case ("accountTeam") { ?#accounts };
          case ("purchaseManager") { ?#admin };
          case (_) { ?#manager };
        };

        let token = generateToken();
        let session : SessionToken = {
          token;
          role;
          storeNumber = null;
          expiry = Time.now() + (24 * 3600 * 1000000000);
        };
        sessions.add(token, session);
        token;
      };
    };
  };

  public shared ({ caller }) func getAllSubUsers(token : Text) : async [SubUser] {
    validateSession(token, null);
    subUsers.values().toArray();
  };

  public shared ({ caller }) func toggleSubUser(token : Text, email : Text) : async () {
    validateSession(token, ?#admin);
    switch (subUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?subUser) {
        let updatedUser : SubUser = {
          email = subUser.email;
          password = subUser.password;
          roleText = subUser.roleText;
          active = not subUser.active;
        };
        subUsers.add(email, updatedUser);
      };
    };
  };

  public shared ({ caller }) func changeSubUserPassword(token : Text, email : Text, newPassword : Text) : async () {
    validateSession(token, ?#admin);
    switch (subUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?subUser) {
        let updatedUser : SubUser = {
          email = subUser.email;
          password = newPassword;
          roleText = subUser.roleText;
          active = subUser.active;
        };
        subUsers.add(email, updatedUser);
      };
    };
  };

  //---------------------
  // App Settings
  //---------------------
  public shared ({ caller }) func setWebhookUrl(token : Text, url : Text) : async () {
    validateSession(token, ?#admin);
    webhookUrl := url;
  };

  public shared ({ caller }) func getWebhookUrl(token : Text) : async Text {
    validateSession(token, ?#admin);
    webhookUrl;
  };

  //---------------------
  // New APIs: Customer Add/Delete
  //---------------------
  public shared ({ caller }) func addCustomer(token : Text, customer : Customer) : async () {
    validateSession(token, ?#admin);
    if (customers.containsKey(customer.storeNumber)) { Runtime.trap("Customer with store number already exists") };
    customers.add(customer.storeNumber, customer);
  };

  public shared ({ caller }) func deleteCustomer(token : Text, storeNumber : Text) : async () {
    validateSession(token, ?#admin);
    if (customers.containsKey(storeNumber)) { customers.remove(storeNumber) };
  };

  //---------------------
  // Fix for get all payments/orders API to allow all authenticated users
  //---------------------
  public shared ({ caller }) func getAllCustomerPayments(token : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().filter(func(payment) { not payment.deleted }).toArray();
  };

  public shared ({ caller }) func getAllCustomerOrders(token : Text) : async [Order] {
    validateSession(token, null);
    orders.values().toArray();
  };

  //---------------------
  // New API for Admin Role
  //---------------------
  public shared ({ caller }) func getAdminRole(token : Text) : async Text {
    validateSession(token, ?#admin);
    "admin";
  };

  //---------------------
  // New API for Admin Status
  //---------------------
  public shared ({ caller }) func getAdminStatus(_token : Text) : async Bool {
    true;
  };

  //---------------------
  // Update Order Status for Rider
  //---------------------
  public shared ({ caller }) func updateOrderStatusRider(token : Text, orderId : Text, status : Text) : async () {
    validateSession(token, null);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder : Order = {
          orderId = order.orderId;
          storeNumber = order.storeNumber;
          companyName = order.companyName;
          address = order.address;
          items = order.items;
          timestamp = order.timestamp;
          status;
          totalAmount = order.totalAmount;
          invoiceNumber = order.invoiceNumber;
          paymentMethod = order.paymentMethod;
          poNumber = order.poNumber;
          gstNumber = order.gstNumber;
          deleteReason = order.deleteReason;
          deliverySignature = order.deliverySignature;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  //---------------------
  // Rider Management
  //---------------------
  public shared ({ caller }) func assignRider(
    token : Text,
    orderId : Text,
    riderEmail : Text,
    riderName : Text,
    riderPhone : Text,
  ) : async () {
    validateSession(token, null);
    let assignment : RiderAssignment = {
      orderId;
      riderEmail;
      riderName;
      riderPhone;
    };

    riderAssignments.add(orderId, assignment);

    // Update/overwrite rider profile if name is not empty
    if (riderName.size() > 0) {
      let profile : RiderProfile = {
        email = riderEmail;
        name = riderName;
        phone = riderPhone;
      };
      riderProfiles.add(riderEmail, profile);
    };
  };

  public shared ({ caller }) func getRiderAssignment(token : Text, orderId : Text) : async ?RiderAssignment {
    validateSession(token, null);
    riderAssignments.get(orderId);
  };

  public shared ({ caller }) func getAllRiderAssignments(token : Text) : async [RiderAssignment] {
    validateSession(token, null);
    let assignmentsIter = riderAssignments.values();
    assignmentsIter.toArray();
  };

  public shared ({ caller }) func getOrdersForRider(token : Text, riderEmail : Text) : async [Order] {
    validateSession(token, null);

    let matchingOrderIds = riderAssignments.values().filter(
      func(a) { a.riderEmail == riderEmail }
    );

    // Collect orders (excluding nulls) into a list
    let resultList = List.empty<Order>();
    for (assignment in matchingOrderIds) {
      switch (orders.get(assignment.orderId)) {
        case (?order) { resultList.add(order) };
        case (null) {};
      };
    };

    resultList.toArray();
  };

  public shared ({ caller }) func saveRiderProfile(
    token : Text,
    email : Text,
    name : Text,
    phone : Text,
  ) : async () {
    validateSession(token, null);

    let profile : RiderProfile = {
      email;
      name;
      phone;
    };
    riderProfiles.add(email, profile);
  };

  public shared ({ caller }) func getRiderProfile(token : Text, email : Text) : async ?RiderProfile {
    validateSession(token, null);
    riderProfiles.get(email);
  };

  public shared ({ caller }) func getAllRiderProfiles(token : Text) : async [RiderProfile] {
    validateSession(token, null);
    let profilesIter = riderProfiles.values();
    profilesIter.toArray();
  };
};
