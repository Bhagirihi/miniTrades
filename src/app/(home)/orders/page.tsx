"use client";

import StockTable from "@/components/Tables/StocksTable";

import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import OrderTable from "@/components/Tables/orderTable";

export default function Orders() {
  return (
    <div className="flex-col min-h-screen bg-gray-100 dark:bg-gray-900 ">
      {/* Animated Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 mb-6 px-6 py-4">
        <StatCard
          title="Current Value"
          value={dashboardStats.currentValue}
          type="currency"
        />
        <StatCard
          title="Executed Orders"
          value={dashboardStats.executedOrders}
        />
        <StatCard title="Pending Orders" value={dashboardStats.pendingOrders} />
        <StatCard
          title="Rejected Orders"
          value={dashboardStats.rejectedOrders}
        />
        <StatCard
          title="Canceled Orders"
          value={dashboardStats.canceledOrders}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 mt-4">
        {/* "Recent Orders" Table on Top */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <OrderTable />
        </motion.div>
      </div>
    </div>
  );
}
const dummyOrders = [
  {
    id: 1,
    symbol: "AAPL",
    status: "executed",
    date: "2025-01-30",
    price: 150.75,
    quantity: 100,
  },
  {
    id: 2,
    symbol: "GOOG",
    status: "pending",
    date: "2025-01-29",
    price: 2750.0,
    quantity: 50,
  },
  {
    id: 3,
    symbol: "TSLA",
    status: "rejected",
    date: "2025-01-28",
    price: 650.5,
    quantity: 200,
  },
  {
    id: 4,
    symbol: "AMZN",
    status: "canceled",
    date: "2025-01-27",
    price: 3450.2,
    quantity: 30,
  },
  {
    id: 5,
    symbol: "MSFT",
    status: "executed",
    date: "2025-01-25",
    price: 300.8,
    quantity: 150,
  },
  {
    id: 6,
    symbol: "FB",
    status: "pending",
    date: "2025-01-24",
    price: 350.0,
    quantity: 120,
  },
  {
    id: 7,
    symbol: "NFLX",
    status: "rejected",
    date: "2025-01-22",
    price: 500.6,
    quantity: 60,
  },
  {
    id: 8,
    symbol: "NVDA",
    status: "canceled",
    date: "2025-01-20",
    price: 225.9,
    quantity: 80,
  },
  {
    id: 9,
    symbol: "BABA",
    status: "executed",
    date: "2025-01-18",
    price: 130.4,
    quantity: 200,
  },
  {
    id: 10,
    symbol: "TSM",
    status: "pending",
    date: "2025-01-17",
    price: 120.75,
    quantity: 90,
  },
  {
    id: 11,
    symbol: "INTC",
    status: "rejected",
    date: "2025-01-15",
    price: 55.3,
    quantity: 250,
  },
  {
    id: 12,
    symbol: "AMD",
    status: "canceled",
    date: "2025-01-14",
    price: 100.0,
    quantity: 150,
  },
  {
    id: 13,
    symbol: "SPY",
    status: "executed",
    date: "2025-01-12",
    price: 400.0,
    quantity: 200,
  },
  {
    id: 14,
    symbol: "VIX",
    status: "pending",
    date: "2025-01-10",
    price: 21.5,
    quantity: 75,
  },
  {
    id: 15,
    symbol: "SQ",
    status: "rejected",
    date: "2025-01-08",
    price: 200.1,
    quantity: 30,
  },
  {
    id: 16,
    symbol: "BA",
    status: "canceled",
    date: "2025-01-06",
    price: 230.25,
    quantity: 90,
  },
];

// Calculate dashboardStats based on dummyOrders
const dashboardStats = {
  currentValue: dummyOrders
    .filter((order) => order.status === "executed")
    .reduce((total, order) => total + order.price * order.quantity, 0),

  executedOrders: dummyOrders.filter((order) => order.status === "executed")
    .length,

  pendingOrders: dummyOrders.filter((order) => order.status === "pending")
    .length,

  rejectedOrders: dummyOrders.filter((order) => order.status === "rejected")
    .length,

  canceledOrders: dummyOrders.filter((order) => order.status === "canceled")
    .length,
};
