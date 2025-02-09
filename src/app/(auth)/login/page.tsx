"use client"; // Ensure client-side rendering for animations

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";

//API
const apiUrl = `${process.env.NEXT_PUBLIC_SERVER_URL}${process.env.NEXT_PUBLIC_LOGIN}`;

// Validation Schema
const loginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
  });

  // Load remembered email on component mount
  useEffect(() => {
    const savedEmail = localStorage.getItem("rememberedEmail");
    if (savedEmail) {
      setValue("email", savedEmail);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (data: any) => {
    setLoading(true);
    const { email, password, rememberMe } = data;

    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    setTimeout(async () => {
      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (response.ok) {
          window.location.href = "/dashboard"; // Redirect to the dashboard
        } else {
          const error = await response.text();
          alert("Error: " + error);
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Something went wrong!");
      }
      setLoading(false);
    }, 500);
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

      {/* Login Card */}
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
          Welcome Back!
        </motion.h2>

        <motion.p
          className="text-gray-600 dark:text-gray-400 text-center mb-6"
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          Login to continue miniTrade
        </motion.p>

        {/* Login Form */}
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
            <p className="text-red-500 text-sm mt-1">
              {typeof errors.email === "object" && "message" in errors.email
                ? (errors.email as any).message
                : "Invalid email"}
            </p>
          </motion.div>

          {/* Password Input */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
          >
            <label className="block text-gray-700 dark:text-gray-300 font-medium">
              Password
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full mt-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg border border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />

            <p className="text-red-500 text-sm mt-1">
              {typeof errors.password === "object" &&
              "message" in errors.password
                ? (errors.password as any).message
                : "Invalid Password"}
            </p>
          </motion.div>

          {/* Remember Me & Forgot Password */}
          <div className="flex justify-between items-center">
            {/* Remember Me */}
            <label className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                {...register("rememberMe")}
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
              />
              <span>Remember Me</span>
            </label>

            {/* Forgot Password */}
            <Link
              href="/forgotpassword"
              className="text-blue-500 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

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
                "Login"
              )}
            </button>
          </motion.div>
        </form>

        {/* Footer Links */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          <p className="text-gray-600 dark:text-gray-400">
            Don&#39;t have an account?{" "}
            <Link href="/register" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}
