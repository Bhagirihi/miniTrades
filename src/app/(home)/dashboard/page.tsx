"use client";

import { useState, useEffect } from "react";
import StockTable from "@/components/Tables/StocksTable";
import CallTable from "@/components/Tables/CallTable";
import PutTable from "@/components/Tables/PutTable";
import { motion } from "framer-motion";
import StatCard from "@/components/StatCard";
import { useSocket } from "@/app/SocketContext";

// Helper function to format currency
const formatCurrency = (amount: number | undefined) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount || 0);
};

export default function Dashboard() {
  const { isConnected, dataStock, dataCall, dataPut } = useSocket();
  const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${process.env.NEXT_PUBLIC_ORDER_VALUES}`;

  // State to hold the data
  const [data, setData] = useState({
    totalInvest: 0,
    currentValue: 0,
    inOrders: 0,
  });

  // ✅ Fetch initial data from API on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        });

        if (response.ok) {
          let result = await response.json();
          let orders = result.data;
          console.log("Fetched orders data:", orders);
          setData(orders[0] || {}); // Set first object or empty
        } else {
          const error = await response.text();
          console.error("Error:", error);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, [apiUrl]); // ✅ Runs only when `apiUrl` changes

  return (
    <div className="flex-col min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Animated Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-6 px-6 py-4">
        <StatCard title="Investment" value={formatCurrency(data.totalInvest)} />
        <StatCard
          title="Current Value"
          value={formatCurrency(data.currentValue)}
        />
        <StatCard title="Total Orders" value={data.inOrders} />
        <StatCard title="Server" value={isConnected ? "ON" : "OFF"} />
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
          <StockTable stocks={dataStock} />
        </motion.div>

        {/* Two Tables Below */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CallTable stocks={dataCall} />
          <PutTable stocks={dataPut} />
        </div>
      </div>
    </div>
  );
}
