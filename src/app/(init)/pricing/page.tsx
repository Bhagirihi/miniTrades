"use client";
import { useState } from "react";

const PricingCard = () => {
  const [selectedPlan, setSelectedPlan] = useState("monthly"); // Default plan
  const [isCardDetailsVisible, setCardDetailsVisible] = useState(true); // Hide card details initially

  const handlePlanChange = (plan: any) => {
    setSelectedPlan(plan);
    setCardDetailsVisible(true); // Show card details form when a plan is selected
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 py-6 flex justify-center items-center">
      <div className="max-w-5xl mx-auto bg-white rounded-xl overflow-hidden shadow-2xl">
        <div
          className="relative bg-cover bg-center h-64"
          style={{
            backgroundImage:
              'url("https://is1-ssl.mzstatic.com/image/thumb/Purple111/v4/dd/95/7e/dd957e3a-abd3-da8a-2211-726a67108938/source/256x256bb.jpg")',
          }}
        >
          <div className="absolute inset-0 bg-black opacity-40"></div>
          <div className="relative z-10 text-center text-white p-8">
            <h2 className="text-4xl font-bold">Choose Your Perfect Plan</h2>
            <p className="mt-2 text-xl">Select the plan that fits your needs</p>
          </div>
        </div>

        <div className="px-4 py-6 grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Left Side - Plan Details */}
          <div className="flex flex-col justify-start space-y-6 py-6">
            <div className="flex justify-center gap-6">
              <button
                onClick={() => handlePlanChange("weekly")}
                className={`${
                  selectedPlan === "weekly"
                    ? "bg-gradient-to-r from-blue-500 to-green-500 text-white"
                    : "bg-gray-200 text-gray-800"
                } px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                Weekly
              </button>
              <button
                onClick={() => handlePlanChange("monthly")}
                className={`${
                  selectedPlan === "monthly"
                    ? "bg-gradient-to-r from-blue-500 to-green-500 text-white"
                    : "bg-gray-200 text-gray-800"
                } px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                Monthly
              </button>
              <button
                onClick={() => handlePlanChange("yearly")}
                className={`${
                  selectedPlan === "yearly"
                    ? "bg-gradient-to-r from-blue-500 to-green-500 text-white"
                    : "bg-gray-200 text-gray-800"
                } px-8 py-4 text-lg font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105`}
              >
                Yearly
              </button>
            </div>

            {/* Plan Details */}
            <div className="text-center">
              {selectedPlan === "weekly" && (
                <>
                  <p className="text-3xl font-bold text-gray-800">
                    $5{" "}
                    <span className="text-lg font-normal text-gray-600">
                      / week
                    </span>
                  </p>
                  <p className="text-gray-600 mt-2">Recurring payment</p>
                  <ul className="text-gray-600 mt-4 space-y-2 text-left px-8">
                    <li>1. Ideal for short-term use</li>
                    <li>2. Low commitment with flexible cancellation</li>
                    <li>3. Great for trials or temporary access</li>
                    <li>4. Allows quick access to services</li>
                    <li>5. No long-term financial commitment</li>
                    <li>6. Pay only for what you need this week</li>
                  </ul>
                </>
              )}

              {selectedPlan === "monthly" && (
                <>
                  <p className="text-3xl font-bold text-gray-800">
                    $15{" "}
                    <span className="text-lg font-normal text-gray-600">
                      / month
                    </span>
                  </p>
                  <p className="text-gray-600 mt-2">Recurring payment</p>
                  <ul className="text-gray-600 mt-4 space-y-2 text-left px-8">
                    <li>1. Perfect for monthly needs</li>
                    <li>2. Ideal for regular use over a short term</li>
                    <li>3. Flexible subscription, cancel anytime</li>
                    <li>4. Great for month-to-month projects</li>
                    <li>5. More affordable for shorter commitments</li>
                    <li>6. Common choice for recurring users</li>
                  </ul>
                </>
              )}

              {selectedPlan === "yearly" && (
                <>
                  <p className="text-3xl font-bold text-gray-800">
                    $150{" "}
                    <span className="text-lg font-normal text-gray-600">
                      / year
                    </span>
                  </p>
                  <p className="text-gray-600 mt-2">Recurring payment</p>
                  <ul className="text-gray-600 mt-4 space-y-2 text-left px-8">
                    <li>1. Best value for long-term use</li>
                    <li>2. Ideal for long-term projects</li>
                    <li>3. Most affordable option for yearly access</li>
                    <li>4. Upfront payment for a full year of service</li>
                    <li>5. No need for monthly renewals</li>
                    <li>6. Offers the greatest savings over time</li>
                  </ul>
                </>
              )}
            </div>
          </div>

          {/* Right Side - Card Details Form */}
          <div className="bg-gray-50 p-8 rounded-lg shadow-lg">
            {isCardDetailsVisible && (
              <div>
                <h3 className="text-2xl font-semibold text-gray-800 mb-4">
                  Enter Your Card Details
                </h3>
                <form className="space-y-4">
                  <div>
                    <label className="block text-gray-600">Card Number</label>
                    <input
                      type="text"
                      placeholder="1234 5678 9101 1121"
                      className="w-full p-4 mt-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-between gap-6">
                    <div className="w-1/2">
                      <label className="block text-gray-600">
                        Expiration Date
                      </label>
                      <input
                        type="text"
                        placeholder="MM/YY"
                        className="w-full p-4 mt-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="w-1/2">
                      <label className="block text-gray-600">CVV</label>
                      <input
                        type="text"
                        placeholder="123"
                        className="w-full p-4 mt-2 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 mt-6 bg-gradient-to-r from-blue-500 to-green-500 text-white rounded-xl shadow-lg transform hover:scale-105 transition duration-300"
                  >
                    Complete Payment
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingCard;
