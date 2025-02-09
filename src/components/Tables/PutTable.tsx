"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface CallData {
  id: number;
  symbol: string;
  ltp: number;
  high: number;
  low: number;
  preLtp: number;
  yHigh: number;
  yLow: number;
  gain: number;
  oi: number;
  volD: number;
  volM: number;
  volY: number;
  fno: number;
  underlying: string;
  strikePrice: number;
  optionType: string;
  pChange: number;
}

const columns = [
  { label: "ID", key: "id" },
  { label: "Stock Name", key: "StockName", sortable: true },
  { label: "Option", key: "option", sortable: true },
  { label: "Change", key: "change", sortable: true },
  { label: "Action", key: "actions" },
];

const itemsPerPage = 5;

export default function PutTable({ stocks }: { stocks: CallData[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Map real stock data to the row structure
  const rows = stocks
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map((stock, index) => ({
      id: stock.id || `${index + 1 + (currentPage - 1) * itemsPerPage}`,
      StockName: `${stock.underlying}-${stock.strikePrice}`,
      option: `₹${stock.optionType}`,
      change: `${stock.pChange.toFixed(2)}%`,
      actions: (
        <button
          onClick={() => handleBuy(`${stock.underlying}-${stock.strikePrice}`)}
          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          BUY
        </button>
      ),
    }));

  // ✅ Handle Buy Button Click
  const handleBuy = (symbol: string) => {
    alert(`Buying stock: ${symbol}`);
  };

  // Sorting logic
  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const sortedRows = [...rows].sort((a, b) => {
    if (!sortKey) return 0;
    const aValue = a[sortKey as keyof typeof a];
    const bValue = b[sortKey as keyof typeof b];

    if (typeof aValue === "string") {
      return sortOrder === "asc"
        ? aValue.localeCompare(bValue as string)
        : (bValue as string).localeCompare(aValue);
    } else {
      return sortOrder === "asc"
        ? (aValue as number) - (bValue as number)
        : (bValue as number) - (aValue as number);
    }
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
        Index Put Data
      </h2>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
          <thead className="text-xs uppercase bg-gray-100 dark:bg-gray-700">
            <tr>
              {columns.map(({ key, label, sortable }) => (
                <th
                  key={key}
                  className="px-4 py-2 cursor-pointer"
                  onClick={() => sortable && handleSort(key)}
                >
                  <div className="flex items-center">
                    {label}
                    {sortable && (
                      <span className="ml-2 text-xs">
                        {sortKey === key
                          ? sortOrder === "asc"
                            ? "▲"
                            : "▼"
                          : ""}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.length > 0 ? (
              sortedRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b dark:border-gray-700">
                  {columns.map(({ key }) => (
                    <td key={key} className="px-4 py-2">
                      {row[key as keyof typeof row]}
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
                  No data available
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
          Page {currentPage} of {Math.ceil(stocks.length / itemsPerPage)}
        </span>
        <button
          onClick={() =>
            setCurrentPage((prev) =>
              Math.min(prev + 1, Math.ceil(stocks.length / itemsPerPage))
            )
          }
          disabled={currentPage * itemsPerPage >= stocks.length}
          className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-md hover:bg-gray-400 dark:hover:bg-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </motion.div>
  );
}
