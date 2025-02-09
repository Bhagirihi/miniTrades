"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";

interface OrderData {
  order: number;
  symbol: string;
  status: "executed" | "pending" | "rejected" | "cancelled" | any;
  date: string;
  price: number;
  quantity: number;
}

const columns = [
  { label: "Order ID", key: "order" },
  { label: "Stock", key: "stick" },
  { label: "Price", key: "buyValue" },
  { label: "Current Price", key: "currentValue" },
  { label: "Quantity", key: "quantity" },
  { label: "Date", key: "date" },
  { label: "Status", key: "status" },
  { label: "Action", key: "actions" },
];

const itemsPerPage = 10;

export default function OrderTable() {
  const [currentTab, setCurrentTab] = useState<
    "all" | "executed" | "pending" | "rejected" | "cancelled"
  >("all");
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${process.env.NEXT_PUBLIC_ORDER_LIST}`;

  useEffect(() => {
    getDataForTab(`orders-${currentTab}`);
  }, [currentTab]);

  async function getDataForTab(tabId: string) {
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tabId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      console.log("data", data);
      setOrders(data.ordersList);
    } catch (err) {
      console.error("Error:", err);
      alert("Something went wrong!");
      setOrders([]);
    }
  }

  // Convert the date format to DD/MM/YYYY, hh:mm:ss AM/PM
  function convertDateFormat(dateString: string) {
    const date = new Date(dateString.split(",")[0]);
    const formattedTime = dateString.split(",")[1];

    const formattedDate = date.toLocaleDateString("en-GB"); // "22/01/2025"

    return `${formattedDate},${formattedTime || ""}`;
  }

  const filteredOrders = orders
    .filter(
      (order) =>
        order?.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order?.order.toString().includes(searchTerm)
    )
    .filter((order) => order.date.includes(dateFilter))
    // .filter((order) => order.date.includes(dateFilter))
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusColor = (
    status: "executed" | "pending" | "rejected" | "cancelled"
  ) => {
    switch (status) {
      case "executed":
        return "bg-green-100 text-green-800"; // Green for executed
      case "pending":
        return "bg-yellow-100 text-yellow-800"; // Yellow for pending
      case "rejected":
        return "bg-red-100 text-red-800"; // Red for rejected
      case "cancelled":
        return "bg-gray-100 text-gray-800"; // Gray for cancelled
      default:
        return "";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
        Orders
      </h2>

      <div className="flex space-x-4 mb-4">
        {["all", "executed", "pending", "rejected", "cancelled"].map((tab) => (
          <button
            key={tab}
            id={`orders-${tab}`}
            className={`px-4 py-2 rounded-md ${
              currentTab === tab
                ? "bg-indigo-600 text-white"
                : "bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-300"
            } hover:bg-indigo-500 transition`}
            onClick={() =>
              setCurrentTab(
                tab as "all" | "executed" | "pending" | "rejected" | "cancelled"
              )
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)} Orders
          </button>
        ))}
      </div>

      <div className="flex mb-4">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by Symbol or Order ID"
          className="px-4 py-2 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        />
      </div>

      <div className="mb-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 w-full rounded-md border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map(({ key, label }) => (
                <th key={key} className="px-4 py-2">
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => (
                <tr
                  key={order.order}
                  className={`border-b dark:border-gray-700 ${getStatusColor(
                    order?.status?.toLowerCase()
                  )}`}
                >
                  {columns.map(({ key }) => (
                    <td key={key} className="px-4 py-2">
                      {key === "actions" ? (
                        <button
                          onClick={() =>
                            alert(`Action for Order: ${order.order}`)
                          }
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
                        >
                          Action
                        </button>
                      ) : key === "date" ? (
                        convertDateFormat(order[key as keyof OrderData])
                      ) : (
                        order[key as keyof OrderData]
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="text-center py-4 text-gray-500"
                >
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="text-gray-700 dark:text-gray-300">
          Page {currentPage} of {Math.ceil(orders.length / itemsPerPage)}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              Math.min(prev + 1, Math.ceil(orders.length / itemsPerPage))
            )
          }
          disabled={currentPage * itemsPerPage >= orders.length}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}
