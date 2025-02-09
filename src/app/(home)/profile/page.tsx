"use client";

import { motion } from "framer-motion";
import { FaEdit } from "react-icons/fa";
import { useState } from "react";

const user = {
  name: "John Doe",
  email: "johndoe@example.com",
  phone: "+1 234 567 890",
  address: "123 Main Street, City, Country",
  profilePic: "/img/profile-pic.jpg", // Ensure this path is correct
};

const ProfileScreen = () => {
  const [isEditing, setIsEditing] = useState(false);

  // Toggle Edit Mode
  const handleEditToggle = () => {
    setIsEditing((prev) => !prev);
  };

  return (
    <div className="p-6 bg-gradient-to-b from-gray-100 to-gray-300 dark:from-gray-900 dark:to-gray-700 min-h-screen flex justify-center items-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <motion.img
              src={user.profilePic}
              alt="Profile Picture"
              className="w-24 h-24 rounded-full object-cover border-4 border-indigo-600 shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.6 }}
            />
            <div>
              <motion.h2
                className="text-3xl font-semibold text-gray-900 dark:text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {user.name}
              </motion.h2>
              <motion.p
                className="text-gray-600 dark:text-gray-300"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              >
                {user.email}
              </motion.p>
            </div>
          </div>
          <button
            onClick={handleEditToggle}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
          >
            <FaEdit className="text-xl" />
          </button>
        </div>

        {/* User Info */}
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Phone Number
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{user.phone}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800 dark:text-white">
              Address
            </h3>
            <p className="text-gray-600 dark:text-gray-300">{user.address}</p>
          </div>
        </div>
      </motion.div>

      {/* Edit Mode */}
      {isEditing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mt-8 max-w-4xl w-full bg-white dark:bg-gray-800 shadow-xl rounded-2xl p-8"
        >
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-6">
            Edit Profile
          </h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Full Name
              </label>
              <input
                type="text"
                defaultValue={user.name}
                className="w-full px-4 py-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                defaultValue={user.email}
                className="w-full px-4 py-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Phone Number
              </label>
              <input
                type="text"
                defaultValue={user.phone}
                className="w-full px-4 py-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Address
              </label>
              <textarea
                defaultValue={user.address}
                rows={3}
                className="w-full px-4 py-2 mt-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-6 space-x-4">
            <button
              onClick={() => setIsEditing(false)}
              className="px-6 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
            >
              Cancel
            </button>
            <button className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Save Changes
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ProfileScreen;
