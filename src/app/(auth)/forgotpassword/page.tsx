"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";

// API URL
const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${process.env.NEXT_PUBLIC_FORGOT_PASSWORD}`;

// Validation Schema
const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });

      if (response.ok) {
        setMessage("Password reset link sent to your email.");
      } else {
        const error = await response.text();
        setMessage(`Error: ${error}`);
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("Something went wrong! Please try again.");
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen flex justify-center items-center bg-gray-100 dark:bg-gray-900">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/img/bgImage.jpg')" }} // Ensure the image is inside `public/img/`
      >
        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
      </div>

      {/* Forgot Password Card */}
      <motion.div
        className="relative z-10 w-full max-w-md bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      >
        <motion.h2
          className="text-2xl font-bold text-center text-gray-900 dark:text-white"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          Forgot Password?
        </motion.h2>

        <motion.p
          className="text-gray-600 dark:text-gray-400 text-center mb-6"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Enter your email to reset your password.
        </motion.p>

        {/* Forgot Password Form */}
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Email Input */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <label className="block text-gray-700 dark:text-gray-300 font-medium">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full mt-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {/* Display error message if any */}

            {typeof errors.email === "object" && "message" in errors.email && (
              <p className="text-red-500 text-sm mt-1">
                {(errors.email as any).message}
              </p>
            )}
          </motion.div>

          {/* Message Display */}
          {message && (
            <motion.p
              className={`text-center text-sm ${
                message.includes("Error") ? "text-red-500" : "text-green-500"
              }`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {message}
            </motion.p>
          )}

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <button
              type="submit"
              className="w-full flex justify-center items-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition"
              disabled={loading}
            >
              {loading ? (
                <span className="animate-spin h-5 w-5 border-4 border-white border-t-transparent rounded-full"></span>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </motion.div>
        </form>

        <div className="flex justify-between items-center">
          {/* Footer Links */}
          <motion.div
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-gray-600 dark:text-gray-400">
              Back to{" "}
              <Link href="/login" className="text-blue-500 hover:underline">
                Login
              </Link>
            </p>
          </motion.div>
          <motion.div
            className="text-center mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          >
            <p className="text-gray-600 dark:text-gray-400">
              Create New?{" "}
              <Link href="/register" className="text-blue-500 hover:underline">
                Sign Up
              </Link>
            </p>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
