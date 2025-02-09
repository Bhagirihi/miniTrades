"use client";
import { useState } from "react";
import { motion } from "framer-motion";

interface FNOData {
  expiryDate: string;
  identifier: string;
  instrument: string;
  instrumentType: string;
  lastPrice: number;
  numberOfContractsTraded: number;
  openInterest: number;
  optionType: string;
  pChange: number;
  premiumTurnover: number;
  strikePrice: number;
  totalTurnover: number;
  underlying: string;
  underlyingValue: number;
}

interface StockData {
  id: number;
  symbol: string;
  lastPrice: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  yearHigh: number;
  yearLow: number;
  open: number;
  avgInOI: number;
  pChange: number;
  perChange30d: number;
  perChange365d: number;
  FNO: FNOData[];
}

const columns = [
  { label: "ID", key: "id" },
  { label: "Stock", key: "StockName", sortable: true },
  { label: "LTP", key: "ltp", sortable: true },
  { label: "High", key: "high", sortable: true },
  { label: "Low", key: "low", sortable: true },
  { label: "PreLTP", key: "preLtp" },
  { label: "52High", key: "yHigh", sortable: true },
  { label: "52Low", key: "yLow", sortable: true },
  { label: "Gain", key: "gain", sortable: true },
  { label: "OI", key: "oi", sortable: true },
  { label: "Vol.(01D)", key: "volD", sortable: true },
  { label: "Vol.(01M)", key: "volM", sortable: true },
  { label: "Vol.(01Y)", key: "volY", sortable: true },
  { label: "F&O", key: "fno" },
];

const itemsPerPage = 5;
const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${process.env.NEXT_PUBLIC_ORDER_ADD}`;

export default function StockTable({ stocks }: { stocks: StockData[] }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // ✅ Handle F&O Row Click
  const toggleAccordion = (rowIndex: number) => {
    setExpandedRow(expandedRow === rowIndex ? null : rowIndex);
  };

  const formatValue = (value: any, defaultValue = "N/A") => {
    // Check if the value is a valid number
    return typeof value === "number" && !isNaN(value)
      ? value.toFixed(2)
      : defaultValue;
  };

  // ✅ Map real stock data to the row structure
  const rows = stocks
    .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
    .map((stock, index) => {
      const GAIN = stock?.lastPrice - stock?.open;
      return {
        id: stock.id || `${index + 1 + (currentPage - 1) * itemsPerPage}`,
        StockName: stock?.symbol || `Product ${index + 1}`,
        ltp: `₹${formatValue(stock?.lastPrice)}`,
        high: `₹${formatValue(stock?.dayHigh)}`,
        low: `₹${formatValue(stock?.dayLow)}`,
        preLtp: `₹${formatValue(stock?.previousClose)}`,
        yHigh: `₹${formatValue(stock?.yearHigh)}`,
        yLow: `₹${formatValue(stock?.yearLow)}`,
        gain: `₹${formatValue(GAIN)}`,
        oi: `${formatValue(stock?.avgInOI)}%`,
        volD: `${formatValue(stock?.pChange)}%`,
        volM: `${formatValue(stock?.perChange30d)}%`,
        volY: `${formatValue(stock?.perChange365d)}%`,
        fno: (
          <button
            onClick={() => toggleAccordion(index)}
            className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            {stock.FNO.length}
          </button>
        ),

        fnoData: stock.FNO, // Store FNO Data
      };
    });

  const handleBuy = async (stock: FNOData) => {
    try {
      if (!stock) {
        alert("Stock data is missing!");
        return;
      }

      const { optionType, lastPrice, strikePrice, underlying } = stock;

      if (!optionType || !lastPrice || !strikePrice || !underlying) {
        alert("Invalid stock data");
        return;
      }

      const newOrder = {
        order: "",
        stick: `${underlying}-${strikePrice}-${optionType}`,
        date: "",
        total: lastPrice,
        gain: "",
        status: "Executed",
        buyValue: lastPrice,
        currentValue: "",
      };

      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newOrder),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      console.log("Order response:", result);
      alert("Order placed successfully!");
    } catch (err) {
      console.error("Error placing order:", err);
      alert("Something went wrong!");
    }
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

  const FnoTable = ({
    data,
    filterCondition = () => true,
  }: {
    data: FNOData[];
    filterCondition?: (fno: FNOData, index: number) => boolean;
  }) => (
    <table className="w-full text-sm text-left text-gray-600 dark:text-gray-300">
      <thead className="text-xs uppercase bg-gray-200 dark:bg-gray-700">
        {data.filter(filterCondition).length > 0 && (
          <tr>
            <th className="px-4 py-2">Expiry Date</th>
            <th className="px-4 py-2">Strick</th>
            <th className="px-4 py-2">Traded</th>
            <th className="px-4 py-2">% Change</th>
            <th className="px-4 py-2">Price</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        )}
      </thead>
      <tbody>
        {data.length > 0 ? (
          data.filter(filterCondition).map((fno, i) => (
            <tr key={i} className="border-b dark:border-gray-700 px-4 py-3">
              <td className="px-4 py-2">{fno.expiryDate}</td>
              <td className="px-4 py-2">
                {fno.underlying}-{fno.strikePrice}-{fno.optionType}
              </td>
              <td className="px-4 py-2">{fno.numberOfContractsTraded}</td>
              <td className="px-4 py-2">{fno.pChange.toFixed(2)}%</td>
              <td className="px-4 py-2">{fno.lastPrice.toFixed(2)}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => handleBuy(fno)}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
                >
                  BUY
                </button>
              </td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={4} className="text-center py-4 text-gray-500">
              No F&O data available
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );

  const RowExpanded = ({
    rowIndex,
    expandedRow,
    row,
    columns,
  }: {
    rowIndex: number;
    expandedRow: number | null;
    row: {
      fnoData: FNOData[];
    };
    columns: { label: string; key: string }[];
  }) =>
    expandedRow === rowIndex && (
      <tr>
        <td
          colSpan={columns.length}
          className="bg-gray-50 dark:bg-gray-800 p-4"
        >
          <div className="grid grid-flow-col grid-rows-1 gap-2 rounded-sm ">
            <div className="row-span-1 row-end-2 bg-slate-100 dark:bg-slate-500 rounded-sm">
              <FnoTable
                data={row.fnoData}
                filterCondition={(number, index) => index % 2 === 0}
              />
            </div>
            <div className="row-start-1 row-end-2 bg-slate-100 dark:bg-slate-500 rounded-sm">
              <FnoTable
                data={row.fnoData}
                filterCondition={(number, index) => index % 2 !== 0}
              />
            </div>
          </div>
        </td>
      </tr>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4"
    >
      <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">
        Stock Market Data
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
                <>
                  <tr key={rowIndex} className="border-b dark:border-gray-700">
                    {columns.map(({ key }) => (
                      <td key={key} className="px-4 py-2">
                        {(() => {
                          const value = row[key as keyof typeof row];

                          if (Array.isArray(value)) {
                            return (
                              <span className="text-blue-500 font-semibold">
                                F&O Data
                              </span>
                            );
                          }

                          return value;
                        })()}
                      </td>
                    ))}
                  </tr>

                  {/* ✅ Accordion Section */}
                  <RowExpanded
                    rowIndex={rowIndex}
                    expandedRow={expandedRow}
                    row={row}
                    columns={columns}
                  />
                </>
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
