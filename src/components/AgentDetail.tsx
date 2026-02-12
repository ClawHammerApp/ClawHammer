import { useState } from "react";
import { Id } from "../../convex/_generated/dataModel";
import { GoalManager } from "./GoalManager";
import { EvaluationForm } from "./EvaluationForm";
import { ProgressChart } from "./ProgressChart";
import { ImprovementStrategies } from "./ImprovementStrategies";

interface AgentDetailProps {
  agentId: Id<"agents">;
  onBack: () => void;
}

// Mock data for demo
const mockAgent = {
  _id: "agent1" as Id<"agents">,
  name: "CustomerServiceBot",
  description: "I help customers with their inquiries and provide support across multiple channels.",
  agentType: "customer service",
  createdAt: Date.now() - 86400000 * 7,
};

const mockGoals = [
  {
    _id: "goal1" as Id<"goals">,
    title: "Provide more concise responses",
    description: "Reduce average response length while maintaining helpfulness and clarity.",
    isActive: true,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    _id: "goal2" as Id<"goals">,
    title: "Improve first-contact resolution rate",
    description: "Resolve customer issues on the first interaction without requiring escalation.",
    isActive: true,
    createdAt: Date.now() - 86400000 * 3,
  },
];

export function AgentDetail({ agentId, onBack }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"goals" | "evaluate" | "progress" | "strategies">("goals");

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="text-[#7c7c7c] hover:text-[#1a1a1b] transition-colors"
        >
          ← Back to Agents
        </button>
      </div>

      {/* Demo Notice */}
      <div className="bg-[#fff3cd] border border-[#ffeaa7] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-2 text-[#856404]">
          <span>⚠️</span>
          <span className="font-medium">Demo Mode</span>
        </div>
        <p className="text-sm text-[#856404] mt-1">
          This is a demonstration with mock data. In a real implementation, this would connect to your agent's actual performance data.
        </p>
      </div>

      {/* Agent Info */}
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[#e01b24] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl">🤖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#1a1a1b] mb-1">{mockAgent.name}</h1>
            <p className="text-[#00d4aa] capitalize mb-2">{mockAgent.agentType}</p>
            <p className="text-[#7c7c7c]">{mockAgent.description}</p>
          </div>
          <div className="text-right text-sm text-[#888]">
            <div>{mockGoals.length} active goals</div>
            <div>12 evaluations</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6 bg-[#2d2d2e] rounded-lg p-1">
        <button
          onClick={() => setActiveTab("goals")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
            activeTab === "goals"
              ? "bg-[#e01b24] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          🎯 Goals
        </button>
        <button
          onClick={() => setActiveTab("evaluate")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
            activeTab === "evaluate"
              ? "bg-[#e01b24] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          📊 Evaluate
        </button>
        <button
          onClick={() => setActiveTab("progress")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
            activeTab === "progress"
              ? "bg-[#e01b24] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          📈 Progress
        </button>
        <button
          onClick={() => setActiveTab("strategies")}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded transition-colors ${
            activeTab === "strategies"
              ? "bg-[#e01b24] text-white"
              : "text-[#888] hover:text-white"
          }`}
        >
          💡 Strategies
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "goals" && <GoalManager agentId={agentId} goals={mockGoals} />}
      {activeTab === "evaluate" && <EvaluationForm agentId={agentId} goals={mockGoals} />}
      {activeTab === "progress" && <ProgressChart agentId={agentId} goals={mockGoals} />}
      {activeTab === "strategies" && <ImprovementStrategies agentId={agentId} goals={mockGoals} />}
    </div>
  );
}
