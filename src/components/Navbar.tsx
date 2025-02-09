"use client";

import Link from "next/link";
import ThemeChanger from "./DarkSwitch";
import Image from "next/image";
import { Disclosure } from "@headlessui/react";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { useDrawer } from "@/components/DrawerContext";
import { FiMenu } from "react-icons/fi";

// Navigation Items
const mainNavItems = ["Product", "Features", "Pricing", "Company", "Blog"];
const authNavItems = ["Login", "Register"];

// Animation Variants
const fadeIn = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

export const Navbar = () => {
  const pathname = usePathname();
  const { toggleDrawer } = useDrawer(); // Use global drawer function

  // Determine which navigation items to show
  const isAppPage = [
    "/dashboard",
    "/",
    "/orders",
    "/profile",
    "/settings",
    "/pricing",
  ].includes(pathname);
  const isWelcomePage = ["/welcome", "/"].includes(pathname);
  const isAuthPage = ["/forgot", "/login", "/register"].includes(pathname);
  const navigation = isAuthPage ? [] : isAppPage ? [] : mainNavItems;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      className="w-full sticky top-0 bg-white dark:bg-trueGray-900 shadow-md z-50"
    >
      <nav className="mx-10 px-8 flex flex-wrap items-center justify-between p-4 lg:justify-between xl:px-1">
        {/* Left Section: Drawer Menu + Logo */}
        <div className="flex items-center space-x-4">
          {!isWelcomePage && !isAuthPage && (
            <FiMenu
              className="text-3xl cursor-pointer text-gray-800 dark:text-white"
              onClick={toggleDrawer}
            />
          )}

          <Link
            href={isAuthPage ? "/" : "/dashboard"}
            className="flex items-center space-x-2 text-2xl font-medium text-indigo-500 dark:text-gray-100"
          >
            <Image
              src="/img/logo.svg"
              width="32"
              height="32"
              alt="Logo"
              className="w-8"
            />
            <span>Nextly</span>
          </Link>
        </div>

        {/* Right Section: Theme & Auth Links */}
        <div className="flex gap-4 items-center  ml-auto lg:ml-0 lg:order-2">
          <ThemeChanger />

          {/* Conditionally Render Login/Register or Get Started */}
          {isAuthPage || (isWelcomePage && !isAppPage) ? (
            <div className="hidden lg:flex gap-3">
              {authNavItems.map((item) => (
                <Link
                  key={item}
                  href={`/${item.toLowerCase()}`}
                  className={`px-6 py-2 rounded-md transition ${
                    pathname === `/${item.toLowerCase()}`
                      ? "text-white bg-indigo-600 hover:bg-indigo-700"
                      : "text-indigo-500 dark:text-gray-100 dark:bg-gray-800 border border-indigo-600 hover:bg-indigo-600 hover:text-white"
                  }`}
                >
                  {item}
                </Link>
              ))}
            </div>
          ) : !isAppPage ? (
            <div className="hidden lg:flex">
              <Link
                href="/"
                className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Get Started
              </Link>
            </div>
          ) : (
            <div className="hidden lg:flex">
              <Link
                href="/"
                className="px-6 py-2 text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
              >
                Log out
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button
                aria-label="Toggle Menu"
                className="px-2 py-1 text-gray-500 rounded-md lg:hidden hover:text-indigo-500 focus:text-indigo-500 focus:bg-indigo-100 focus:outline-none dark:text-gray-300 dark:focus:bg-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                >
                  {open ? (
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M18.278 16.864a1 1 0 0 1-1.414 1.414l-4.829-4.828-4.828 4.828a1 1 0 0 1-1.414-1.414l4.828-4.829-4.828-4.828a1 1 0 0 1 1.414-1.414l4.829 4.828 4.828-4.828a1 1 0 1 1 1.414 1.414l-4.828 4.829 4.828 4.828z"
                    />
                  ) : (
                    <path
                      fillRule="evenodd"
                      d="M4 5h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2zm0 6h16a1 1 0 0 1 0 2H4a1 1 0 1 1 0-2z"
                    />
                  )}
                </svg>
              </Disclosure.Button>

              {/* Mobile Menu Panel */}
              <Disclosure.Panel className="flex flex-wrap w-full my-5 lg:hidden">
                <>
                  {navigation.map((item, index) => (
                    <Link
                      key={index}
                      href={`/${item.toLowerCase()}`}
                      className="w-full px-4 py-2 -ml-4 text-gray-500 rounded-md dark:text-gray-300 hover:text-indigo-500 focus:text-indigo-500 focus:bg-indigo-100 dark:focus:bg-gray-800 focus:outline-none"
                    >
                      {item}
                    </Link>
                  ))}
                  {isAuthPage || isWelcomePage ? (
                    authNavItems.map((item) => (
                      <Link
                        key={item}
                        href={`/${item.toLowerCase()}`}
                        className="w-full px-6 py-2 mt-3 text-center text-indigo-500 dark:text-gray-900 dark:bg-gray-100 border border-indigo-600 rounded-md hover:bg-indigo-600 hover:text-white"
                      >
                        {item}
                      </Link>
                    ))
                  ) : (
                    <Link
                      href="/"
                      className="w-full px-6 py-2 mt-3 text-center text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
                    >
                      Get Started
                    </Link>
                  )}
                </>
              </Disclosure.Panel>
            </>
          )}
        </Disclosure>

        {/* Desktop Menu */}
        <div className="hidden text-center lg:flex lg:items-center">
          <ul className="flex items-center justify-end flex-1 space-x-6">
            {navigation.map((menu, index) => (
              <li key={index}>
                <Link
                  href={`/${menu.toLowerCase()}`}
                  className="text-lg font-normal text-gray-800 dark:text-gray-200 hover:text-indigo-500 focus:text-indigo-500 focus:bg-indigo-100 focus:outline-none dark:focus:bg-gray-800 px-4 py-2 rounded-md"
                >
                  {menu}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </motion.div>
  );
};
