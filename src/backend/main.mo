import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import Float "mo:core/Float";
import Runtime "mo:core/Runtime";



actor {
  //---------------------
  // Types
  //---------------------
  type Product = {
    id : Nat;
    name : Text;
    active : Bool;
    unit : Text;
    rate : Float;
    imageBase64 : Text;
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
    active : Bool;
  };

  type CustomerInput = {
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
    deliverySignedAt : ?Time.Time;
    deliveryStartTime : ?Time.Time;
    deliveryEndTime : ?Time.Time;
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

  public type UserRole = {
    #admin;
    #manager;
    #accounts;
  };

  module UserRole {
    public func toText(role : UserRole) : Text {
      switch (role) {
        case (#admin) { "admin" };
        case (#manager) { "manager" };
        case (#accounts) { "accounts" };
      };
    };
  };

  // SubUser type -- kept compatible with previous stable shape (no name/phone).
  // Rider name/phone is stored separately in riderProfiles.
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
  // Stable Storage Arrays (survive canister upgrades)
  //---------------------
  stable var stableProducts : [(Nat, Product)] = [];
  stable var stableCustomers : [(Text, Customer)] = [];
  stable var stableOrders : [(Text, Order)] = [];
  stable var stableUsers : [(Text, UserRole)] = [];
  stable var stableSubUsers : [(Text, SubUser)] = [];
  stable var stablePayments : [(Text, Payment)] = [];
  stable var stableSessions : [(Text, SessionToken)] = [];
  stable var stableRiderAssignments : [(Text, RiderAssignment)] = [];
  stable var stableRiderProfiles : [(Text, RiderProfile)] = [];

  stable var stableProductIdCounter : Nat = 1;
  stable var stableOrderIdCounter : Nat = 1;
  stable var stablePaymentIdCounter : Nat = 1;
  stable var stablePasswordHash : Text = "Admin@1234";
  stable var stableWebhookUrl : Text = "";
  stable var stableCompanyProfile : CompanyProfile = {
    gstNumber = "";
    contactPhone = "";
    contactEmail = "";
    address = "";
    logoBase64 = "";
  };

  //---------------------
  // Runtime Maps (loaded from stable on startup)
  //---------------------
  let products = Map.fromIter<Nat, Product>(stableProducts.values());
  let customers = Map.fromIter<Text, Customer>(stableCustomers.values());
  let orders = Map.fromIter<Text, Order>(stableOrders.values());
  let users = Map.fromIter<Text, UserRole>(stableUsers.values());
  let subUsers = Map.fromIter<Text, SubUser>(stableSubUsers.values());
  let payments = Map.fromIter<Text, Payment>(stablePayments.values());
  let sessions = Map.fromIter<Text, SessionToken>(stableSessions.values());
  let riderAssignments = Map.fromIter<Text, RiderAssignment>(stableRiderAssignments.values());
  let riderProfiles = Map.fromIter<Text, RiderProfile>(stableRiderProfiles.values());

  var companyProfile : CompanyProfile = stableCompanyProfile;
  var productIdCounter = stableProductIdCounter;
  var orderIdCounter = stableOrderIdCounter;
  var paymentIdCounter = stablePaymentIdCounter;
  var passwordHash = stablePasswordHash;
  var webhookUrl = stableWebhookUrl;

  //---------------------
  // Upgrade Hooks
  //---------------------
  system func preupgrade() {
    stableProducts := products.entries().toArray();
    stableCustomers := customers.entries().toArray();
    stableOrders := orders.entries().toArray();
    stableUsers := users.entries().toArray();
    stableSubUsers := subUsers.entries().toArray();
    stablePayments := payments.entries().toArray();
    stableSessions := sessions.entries().toArray();
    stableRiderAssignments := riderAssignments.entries().toArray();
    stableRiderProfiles := riderProfiles.entries().toArray();
    stableProductIdCounter := productIdCounter;
    stableOrderIdCounter := orderIdCounter;
    stablePaymentIdCounter := paymentIdCounter;
    stablePasswordHash := passwordHash;
    stableWebhookUrl := webhookUrl;
    stableCompanyProfile := companyProfile;
  };

  system func postupgrade() {
    // NOTE: Do NOT clear stable arrays here.
    // Stable arrays are populated in preupgrade so the runtime can persist them.
    // Clearing them here would destroy all data on every upgrade.
  };

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

  //---------------------
  // Company Profile APIs
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

  // Legacy createSubUser (kept for compatibility)
  public shared ({ caller }) func createSubUser(token : Text, email : Text, role : UserRole) : async () {
    validateSession(token, ?#admin);
    if (users.containsKey(email)) { Runtime.trap("Email already exists") };
    users.add(email, role);
  };

  // Full sub-user creation with password, name, phone, and role text.
  // name/phone are stored in riderProfiles (for riders) to avoid stable type changes.
  public shared ({ caller }) func createSubUserWithPassword(
    token : Text,
    email : Text,
    password : Text,
    roleText : Text,
    name : Text,
    phone : Text,
  ) : async () {
    validateSession(token, ?#admin);
    if (subUsers.containsKey(email)) { Runtime.trap("User already exists") };
    let su : SubUser = {
      email;
      password;
      roleText;
      active = true;
    };
    subUsers.add(email, su);
    // Always save a rider profile entry so name/phone are retrievable
    let rp : RiderProfile = { email; name; phone };
    riderProfiles.add(email, rp);
  };

  // Get all sub-users (Team Accounts)
  public shared ({ caller }) func getAllSubUsers(token : Text) : async [SubUser] {
    validateSession(token, null);
    subUsers.values().toArray();
  };

  // Delete a sub-user (admin only)
  public shared ({ caller }) func deleteSubUser(token : Text, email : Text) : async () {
    validateSession(token, ?#admin);
    if (subUsers.containsKey(email)) {
      subUsers.remove(email);
    };
    if (riderProfiles.containsKey(email)) {
      riderProfiles.remove(email);
    };
  };

  // Toggle sub-user active status
  public shared ({ caller }) func toggleSubUser(token : Text, email : Text) : async () {
    validateSession(token, ?#admin);
    switch (subUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?su) {
        let updated : SubUser = {
          email = su.email;
          password = su.password;
          roleText = su.roleText;
          active = not su.active;
        };
        subUsers.add(email, updated);
      };
    };
  };

  // Change sub-user password (admin only)
  public shared ({ caller }) func changeSubUserPassword(token : Text, email : Text, newPassword : Text) : async () {
    validateSession(token, ?#admin);
    switch (subUsers.get(email)) {
      case (null) { Runtime.trap("User not found") };
      case (?su) {
        let updated : SubUser = {
          email = su.email;
          password = newPassword;
          roleText = su.roleText;
          active = su.active;
        };
        subUsers.add(email, updated);
      };
    };
  };

  // Save / update a rider profile (name and phone for any sub-user)
  public shared ({ caller }) func saveRiderProfile(token : Text, email : Text, name : Text, phone : Text) : async () {
    validateSession(token, null);
    let rp : RiderProfile = { email; name; phone };
    riderProfiles.add(email, rp);
  };

  // Get all rider profiles
  public shared ({ caller }) func getAllRiderProfiles(token : Text) : async [RiderProfile] {
    validateSession(token, null);
    riderProfiles.values().toArray();
  };

  // Sub-user / Rider login (checks subUsers map with password validation)
  public shared ({ caller }) func subUserLogin(email : Text, password : Text) : async Text {
    // First check full subUsers map (supports password validation)
    switch (subUsers.get(email)) {
      case (?su) {
        if (su.password != password) { Runtime.trap("Invalid credentials") };
        if (not su.active) { Runtime.trap("Account is inactive") };
        let token = generateToken();
        let session : SessionToken = {
          token;
          role = ?#manager;
          storeNumber = null;
          expiry = Time.now() + (24 * 3600 * 1000000000);
        };
        sessions.add(token, session);
        return token;
      };
      case (null) {};
    };
    // Fallback: check legacy users map (no password validation)
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
      let product : Product = {
        id = idCounter;
        name;
        active = true;
        unit = "KGS";
        rate = 0.0;
        imageBase64 = "";
      };
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

  // Replace Products With Image Preservation API
  public shared ({ caller }) func replaceProductsWithDetails(token : Text, items : [ProductInput]) : async [Product] {
    validateSession(token, ?#admin);

    // Create new product entries with preserved images where applicable
    let newProducts = Map.empty<Nat, Product>();
    var idCounter = 1;

    for (item in items.values()) {
      // Check if an existing product has the same name to preserve image
      let preservedImage = switch (products.values().find(func(p) { p.name == item.name })) {
        case (null) { "" };
        case (?existingProduct) {
          switch (item.imageBase64) {
            case (?newImage) { newImage };
            case (null) { existingProduct.imageBase64 };
          };
        };
      };

      let product : Product = {
        id = idCounter;
        name = item.name;
        active = true;
        unit = item.unit;
        rate = item.rate;
        imageBase64 = preservedImage;
      };
      newProducts.add(idCounter, product);
      idCounter += 1;
    };

    // Clear old products and add new ones
    products.clear();
    for ((id, product) in newProducts.entries()) {
      products.add(id, product);
    };

    // Return the saved products so the caller can verify data was persisted
    products.values().toArray();
  };

  public shared ({ caller }) func setAllProductsActive(token : Text, active : Bool) : async () {
    validateSession(token, ?#admin);
    for ((productId, product) in products.entries()) {
      let updatedProduct : Product = {
        id = product.id;
        name = product.name;
        active;
        unit = product.unit;
        rate = product.rate;
        imageBase64 = product.imageBase64;
      };
      products.add(productId, updatedProduct);
    };
  };

  public query ({ caller }) func getAllProducts(_token : Text) : async [Product] {
    products.values().toArray();
  };

  public query ({ caller }) func getAllProductsPublic() : async [Product] {
    products.values().toArray();
  };

  // Product Image Handling API
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
  public shared ({ caller }) func replaceCustomers(token : Text, customerList : [CustomerInput]) : async () {
    validateSession(token, ?#admin);
    customers.clear();

    for (customerInput in customerList.values()) {
      let customer : Customer = {
        storeNumber = customerInput.storeNumber;
        name = customerInput.name;
        phone = customerInput.phone;
        companyName = customerInput.companyName;
        address = customerInput.address;
        gstNumber = customerInput.gstNumber;
        email = customerInput.email;
        password = customerInput.password;
        active = true;
      };
      customers.add(customer.storeNumber, customer);
    };
  };

  public shared ({ caller }) func addCustomersOnly(token : Text, customerList : [CustomerInput]) : async () {
    validateSession(token, ?#admin);

    for (customerInput in customerList.values()) {
      if (not customers.containsKey(customerInput.storeNumber)) {
        let customer : Customer = {
          storeNumber = customerInput.storeNumber;
          name = customerInput.name;
          phone = customerInput.phone;
          companyName = customerInput.companyName;
          address = customerInput.address;
          gstNumber = customerInput.gstNumber;
          email = customerInput.email;
          password = customerInput.password;
          active = true;
        };
        customers.add(customer.storeNumber, customer);
      };
    };
  };

  public shared ({ caller }) func customerLogin(storeNumber : Text, password : Text) : async Text {
    switch (customers.get(storeNumber)) {
      case (null) { Runtime.trap("Invalid credentials") };
      case (?customer) {
        if (customer.password != password) { Runtime.trap("Invalid password") };
        if (not customer.active) { Runtime.trap("ACCOUNT_HOLD") };

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

  public shared ({ caller }) func updateCustomer(token : Text, storeNumber : Text, updatedCustomer : CustomerInput) : async () {
    validateSession(token, ?#admin);
    if (not customers.containsKey(storeNumber)) {
      Runtime.trap("Customer with store number does not exist");
    };
    let customer : Customer = {
      storeNumber = updatedCustomer.storeNumber;
      name = updatedCustomer.name;
      phone = updatedCustomer.phone;
      companyName = updatedCustomer.companyName;
      address = updatedCustomer.address;
      gstNumber = updatedCustomer.gstNumber;
      email = updatedCustomer.email;
      password = updatedCustomer.password;
      active = true;
    };
    customers.add(storeNumber, customer);
  };

  public shared ({ caller }) func addCustomer(token : Text, newCustomer : CustomerInput) : async () {
    validateSession(token, ?#admin);
    if (customers.containsKey(newCustomer.storeNumber)) { Runtime.trap("Customer with store number already exists") };

    let customer : Customer = {
      storeNumber = newCustomer.storeNumber;
      name = newCustomer.name;
      phone = newCustomer.phone;
      companyName = newCustomer.companyName;
      address = newCustomer.address;
      gstNumber = newCustomer.gstNumber;
      email = newCustomer.email;
      password = newCustomer.password;
      active = true;
    };
    customers.add(newCustomer.storeNumber, customer);
  };

  public shared ({ caller }) func deleteCustomer(token : Text, storeNumber : Text) : async () {
    validateSession(token, ?#admin);
    if (customers.containsKey(storeNumber)) { customers.remove(storeNumber) };
  };

  public shared ({ caller }) func toggleCustomerActive(token : Text, storeNumber : Text) : async () {
    validateSession(token, ?#admin);
    switch (customers.get(storeNumber)) {
      case (null) { Runtime.trap("Customer not found") };
      case (?customer) {
        let updatedCustomer : Customer = {
          storeNumber = customer.storeNumber;
          name = customer.name;
          phone = customer.phone;
          companyName = customer.companyName;
          address = customer.address;
          gstNumber = customer.gstNumber;
          email = customer.email;
          password = customer.password;
          active = not customer.active;
        };
        customers.add(storeNumber, updatedCustomer);
      };
    };
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
      deliverySignedAt = null;
      deliveryStartTime = null;
      deliveryEndTime = null;
    };

    orders.add(orderId, order);
    orderIdCounter += 1;
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
      deliverySignedAt = null;
      deliveryStartTime = null;
      deliveryEndTime = null;
    };

    orders.add(orderId, order);
    orderIdCounter += 1;
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
          deliverySignedAt = order.deliverySignedAt;
          deliveryStartTime = if (status == "on_the_way") { ?Time.now() } else { order.deliveryStartTime };
          deliveryEndTime = if (status == "delivered") { ?Time.now() } else { order.deliveryEndTime };
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
          deliverySignedAt = existingOrder.deliverySignedAt;
          deliveryStartTime = existingOrder.deliveryStartTime;
          deliveryEndTime = existingOrder.deliveryEndTime;
        };

        orders.add(orderId, updatedOrder);
      };
    };
  };

  //---------------------
  // Payment Management (server-side, visible on all devices)
  //---------------------
  public shared ({ caller }) func addPayment(
    token : Text,
    storeNumber : Text,
    companyName : Text,
    amount : Float,
    paymentMethod : Text,
    chequeDetails : ?Text,
    utrDetails : ?Text,
    paymentAdviceImage : Text,
  ) : async Text {
    validateSession(token, null);
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
    paymentId;
  };

  public shared ({ caller }) func getAllPayments(token : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().toArray();
  };

  public shared ({ caller }) func getPaymentsByStore(token : Text, storeNumber : Text) : async [Payment] {
    validateSession(token, null);
    payments.values().filter(func(p) { p.storeNumber == storeNumber }).toArray();
  };

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
    validateSession(token, null);
    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?existing) {
        let updated : Payment = {
          paymentId = existing.paymentId;
          storeNumber;
          companyName;
          amount;
          paymentMethod;
          chequeDetails;
          utrDetails;
          timestamp = existing.timestamp;
          deleted = existing.deleted;
          deleteReason = existing.deleteReason;
          paymentAdviceImage = if (paymentAdviceImage == "") { existing.paymentAdviceImage } else { paymentAdviceImage };
        };
        payments.add(paymentId, updated);
      };
    };
  };

  public shared ({ caller }) func softDeletePayment(token : Text, paymentId : Text, reason : Text) : async () {
    validateSession(token, null);
    switch (payments.get(paymentId)) {
      case (null) { Runtime.trap("Payment not found") };
      case (?existing) {
        let updated : Payment = {
          paymentId = existing.paymentId;
          storeNumber = existing.storeNumber;
          companyName = existing.companyName;
          amount = existing.amount;
          paymentMethod = existing.paymentMethod;
          chequeDetails = existing.chequeDetails;
          utrDetails = existing.utrDetails;
          timestamp = existing.timestamp;
          deleted = true;
          deleteReason = ?reason;
          paymentAdviceImage = existing.paymentAdviceImage;
        };
        payments.add(paymentId, updated);
      };
    };
  };
};
