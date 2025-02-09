"use client";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX,
  FiHome,
  FiClipboard,
  FiSettings,
  FiUser,
  FiCreditCard,
  FiLogOut,
} from "react-icons/fi";
import Link from "next/link";
import { useDrawer } from "./DrawerContext";
import { usePathname } from "next/navigation";

const menuItems = [
  { name: "Dashboard", href: "/dashboard", icon: <FiHome /> },
  { name: "Orders", href: "/orders", icon: <FiClipboard /> },
  { name: "Profile", href: "/profile", icon: <FiUser /> },
  { name: "Pricing", href: "/pricing", icon: <FiCreditCard /> },
  { name: "Settings", href: "/settings", icon: <FiSettings /> },
];

const Drawer = () => {
  const { isDrawerOpen, closeDrawer } = useDrawer();
  const pathname = usePathname();
  return (
    <AnimatePresence>
      {isDrawerOpen && (
        <motion.aside
          initial={{ x: -250 }}
          animate={{ x: 0 }}
          exit={{ x: -250 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="fixed left-0 top-0 w-64 h-full bg-white dark:bg-gray-800 shadow-lg p-6 z-50 flex flex-col"
        >
          {/* Header */}
          <button
            className="flex justify-between items-center w-full mb-6 sticky top-0 bg-white dark:bg-gray-800 p-4 shadow-md rounded-lg cursor-pointer"
            onClick={closeDrawer}
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Menu
            </h2>
            <FiX className="text-2xl text-gray-700 dark:text-gray-300" />
          </button>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-4">
            {menuItems.map((item, index) => {
              const isActive = pathname === item.href; // Check if it's the current page
              return (
                <Link
                  key={index}
                  href={item.href}
                  className={`flex items-center gap-3 p-3 rounded-lg transition ${
                    isActive
                      ? "bg-indigo-500 text-white dark:bg-indigo-600"
                      : "text-gray-700 dark:text-gray-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600"
                  }`}
                  onClick={closeDrawer}
                >
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-md font-medium">{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout Button */}
          <button
            onClick={() => {
              alert("Logging out...");
              closeDrawer();
            }}
            className="flex items-center gap-3 p-3 text-red-600 dark:text-red-400 hover:bg-red-500 hover:text-white dark:hover:bg-red-600 rounded-lg transition"
          >
            <FiLogOut className="text-lg" />
            <span className="text-md font-medium">Log Out</span>
          </button>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

export default Drawer;
