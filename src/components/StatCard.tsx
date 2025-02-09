"use client";
import { motion } from "framer-motion";

interface StatCardProps {
  title: string;
  value: any;
  type?: string | null; // Allow 'type' to be either string or null
  icon?: React.ReactNode;
}

const StatCard = ({ title, value, icon, type }: StatCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="bg-white dark:bg-gray-800 shadow-lg rounded-xl p-6 flex flex-col items-center justify-center text-center"
    >
      {/* Icon (if provided) */}
      {icon && (
        <div className="mb-2 text-indigo-500 dark:text-indigo-400 text-3xl">
          {icon}
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
      <p className="text-4xl font-bold text-indigo-600 dark:text-indigo-400">
        {type == "currency" ? `₹${value.toLocaleString("en-IN")}` : value}
      </p>
    </motion.div>
  );
};

export default StatCard;
