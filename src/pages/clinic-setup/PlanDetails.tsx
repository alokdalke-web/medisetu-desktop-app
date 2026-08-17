// src/pages/PlanDetails.tsx
import  { useState } from "react";
import Header from "../../components/shared/Header";

function PlanDetails() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const plans = [
    {
      name: "Basic Plan",
      price: "₹499",
      features: [
        "Manage Clinic & Doctor Profile",
        "Appointment Booking",
        "Basic Reports",
      ],
      button: "Select Basic",
    },
    {
      name: "Standard Plan",
      price: "₹999",
      recommended: true,
      features: [
        "All Basic Features",
        "Patient History & Medical Records",
        "Priority Support",
      ],
      button: "Select Standard",
    },
    {
      name: "Premium Plan",
      price: "₹1499",
      features: [
        "All Standard Features",
        "Patient History & Medical Records",
        "Advanced Analytics",
      ],
      button: "Select Premium",
    },
  ];

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-10 px-4">
        {/* Title */}
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-semibold">
            Choose Your Subscription Plan
          </h2>
          <p className="mt-2 text-gray-600 text-sm sm:text-base">
            Activate Your Account By Selecting A Plan That Suits Your Clinic’s
            Needs.
          </p>
        </div>

        {/* Plans */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedPlan(plan.name)}
              className={`relative rounded-2xl border shadow-sm bg-white p-6 flex flex-col justify-between hover:shadow-md transition cursor-pointer
      ${
        selectedPlan === plan.name
          ? "border-primary "
          : "border-gray-200"
      }
    `}
            >
              {plan.recommended && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-medium px-3 py-1 rounded-full">
                  Recommended
                </span>
              )}

              {/* Plan header */}
              <div className="text-center">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="mt-2 text-2xl font-bold">
                  {plan.price}{" "}
                  <span className="text-sm font-normal">/ month</span>
                </p>
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 text-sm text-gray-700 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full border border-primary bg-primary flex items-center justify-center text-primary text-xs">
                      ✓
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <button
                onClick={() => setSelectedPlan(plan.name)}
                className={`mt-6 rounded-lg py-3 px-4 text-sm font-medium transition 
                  ${
                    selectedPlan === plan.name
                      ? "bg-primary text-white"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
              >
                {plan.button}
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

export default PlanDetails;
