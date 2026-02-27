import Map "mo:core/Map";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Runtime "mo:core/Runtime";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import Timer "mo:core/Timer";
import Float "mo:core/Float";



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
      let product : Product = { id = idCounter; name; active = true; unit = "KGS"; rate = 0.0 };
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
    };

    orders.add(orderId, order);
    orderIdCounter += 1;

    if (webhookUrl != "") {
      // await outCall.httpPostRequest(webhookUrl, [], "{ \"orderId\": \"" # orderId # "\" }", transform);
    };
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
    // Calculate total amount
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
    };

    orders.add(orderId, order);
    orderIdCounter += 1;

    if (webhookUrl != "") {
      // await outCall.httpPostRequest(webhookUrl, [], "{ \"orderId\": \"" # orderId # "\" }", transform);
    };
    orderId;
  };

  public shared ({ caller }) func getAllOrders(token : Text) : async [Order] {
    validateSession(token, ?#admin);
    orders.values().toArray();
  };

  public shared ({ caller }) func getOrdersByStore(token : Text, storeNumber : Text) : async [Order] {
    validateSession(token, null);
    orders.values().filter(func(order) { order.storeNumber == storeNumber }).toArray();
  };

  public shared ({ caller }) func updateOrderStatus(token : Text, orderId : Text, status : Text) : async () {
    validateSession(token, ?#admin);
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
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func editOrderItems(token : Text, orderId : Text, newItems : [OrderItem]) : async () {
    validateSession(token, ?#admin);

    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?existingOrder) {
        // Calculate new total
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
    };

    payments.add(paymentId, payment);
    paymentIdCounter += 1;
  };

  public shared ({ caller }) func getPaymentsByStore(token : Text, storeNumber : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().filter(func(payment) { payment.storeNumber == storeNumber }).toArray();
  };

  public shared ({ caller }) func getAllPayments(token : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().toArray();
  };

  //---------------------
  // Statement Generation
  //---------------------
  public shared ({ caller }) func getCustomerStatement(token : Text, storeNumber : Text, _fromTime : Int, _toTime : Int) : async [StatementEntry] {
    validateSession(token, ?#admin);
    let entries = List.empty<StatementEntry>();

    for (order in orders.values()) {
      if (order.storeNumber == storeNumber) {
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
      if (payment.storeNumber == storeNumber) {
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

    for (payment in payments.values()) {
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

    entries.toArray();
  };

  public shared ({ caller }) func getMyStatement(token : Text, _fromTime : Int, _toTime : Int) : async [StatementEntry] {
    validateSession(token, null);
    switch (sessions.get(token)) {
      case (?session) {
        switch (session.storeNumber) {
          case (?storeNumber) {
            await getCustomerStatement(token, storeNumber, _fromTime, _toTime);
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
        generateToken();
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
};
