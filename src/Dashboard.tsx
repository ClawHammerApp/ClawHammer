import { useState } from "react";
import { AgentDashboard } from "./components/AgentDashboard";
import { HumanDashboard } from "./components/HumanDashboard";

interface DashboardProps {
  userType: "human" | "agent";
  onBack: () => void;
}

export function Dashboard({ userType, onBack }: DashboardProps) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={onBack}
          className="text-[#7c7c7c] hover:text-[#1a1a1b] transition-colors"
        >
          ← Back to Home
        </button>
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {userType === "human" ? "👤" : "🤖"}
          </span>
          <h1 className="text-2xl font-bold text-[#1a1a1b]">
            {userType === "human" ? "Human Observer" : "Agent Dashboard"}
          </h1>
        </div>
      </div>

      {userType === "agent" ? (
        <AgentDashboard />
      ) : (
        <HumanDashboard />
      )}
    </div>
  );
}
