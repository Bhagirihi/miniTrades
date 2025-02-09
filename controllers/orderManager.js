const fs = require("fs");
const path = require("path");

// File Path
const ordersFilePath = path.join(__dirname, "../data/orders.json");

// Helper function to read the orders file
const readOrdersFile = () => {
  if (!fs.existsSync(ordersFilePath)) {
    fs.writeFileSync(ordersFilePath, JSON.stringify([]));
  }
  const data = fs.readFileSync(ordersFilePath);
  return JSON.parse(data);
};

// Helper function to write data to orders file
const writeOrdersFile = (data) =>
  fs.writeFileSync(ordersFilePath, JSON.stringify(data, null, 2));

/**
 * ✅ Add or Update Order
 */
exports.addOrUpdateOrder = (req, res) => {
  const { order, currentValue } = req.body;

  if (!order || !currentValue) {
    return res
      .status(400)
      .json({ message: "Order ID and Current Value are required." });
  }

  const ordersData = readOrdersFile();
  const orderIndex = ordersData.findIndex((o) => o.order === order);

  if (orderIndex !== -1) {
    // Update existing order
    ordersData[orderIndex].currentValue = currentValue;
    writeOrdersFile(ordersData);
    return res.json({
      message: "Order updated successfully.",
      updatedOrder: ordersData[orderIndex],
    });
  } else {
    // Add new order
    const newOrder = {
      order,
      stick: `Nifty-${order}`, // Placeholder for stick value
      date: new Date().toISOString().split("T")[0],
      total: 0,
      gain: "0.0",
      status: "Pending",
      buyValue: 0,
      currentValue,
    };
    ordersData.push(newOrder);
    writeOrdersFile(ordersData);
    return res.status(201).json({
      message: "Order added successfully.",
      newOrder,
    });
  }
};

/**
 * ✅ Get All Orders
 */
exports.getOrders = (req, res) => {
  const ordersData = readOrdersFile();
  res.status(200).json(ordersData);
};

/**
 * ✅ Get Single Order by ID
 */
exports.getOrderById = (req, res) => {
  const { orderId } = req.params;
  const ordersData = readOrdersFile();
  const order = ordersData.find((o) => o.order === parseInt(orderId));

  if (!order) {
    return res.status(404).json({ message: "Order not found." });
  }

  res.json(order);
};

/**
 * ✅ Delete Order
 */
exports.deleteOrder = (req, res) => {
  const { orderId } = req.params;
  let ordersData = readOrdersFile();
  const initialLength = ordersData.length;

  ordersData = ordersData.filter((o) => o.order !== parseInt(orderId));

  if (ordersData.length === initialLength) {
    return res.status(404).json({ message: "Order not found." });
  }

  writeOrdersFile(ordersData);
  res.json({ message: "Order deleted successfully." });
};
