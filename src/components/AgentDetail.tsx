import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { GoalManager } from "./GoalManager";
import { EvaluationForm } from "./EvaluationForm";
import { ProgressChart } from "./ProgressChart";
import { ImprovementStrategies } from "./ImprovementStrategies";

interface AgentDetailProps {
  agentId: Id<"agents">;
  onBack: () => void;
}

export function AgentDetail({ agentId, onBack }: AgentDetailProps) {
  const [activeTab, setActiveTab] = useState<"goals" | "evaluate" | "progress" | "strategies">("goals");

  const agent = useQuery(api.skillApi.getAgent, { agentId });
  const goals = useQuery(api.skillApi.getAgentGoals, { agentId });
  const evaluations = useQuery(api.skillApi.getAgentEvaluations, { agentId });
  const strategies = useQuery(api.skillApi.getAgentStrategies, { agentId });

  if (!agent || !goals || !evaluations || !strategies) {
    return (
      <div className="text-center py-8 text-[#7c7c7c]">
        Loading agent data...
      </div>
    );
  }

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

      {/* Agent Info */}
      <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-[#e01b24] rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white text-2xl">🤖</span>
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-[#1a1a1b] mb-1">{agent.name}</h1>
            <p className="text-[#00d4aa] capitalize mb-2">{agent.agentType}</p>
            <p className="text-[#7c7c7c]">{agent.description}</p>
          </div>
          <div className="text-right text-sm text-[#888]">
            <div>{goals.filter((g: any) => g.isActive).length} active goals</div>
            <div>{evaluations.length} evaluations</div>
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
      {activeTab === "goals" && <GoalManager agentId={agentId} goals={goals} />}
      {activeTab === "evaluate" && <EvaluationForm agentId={agentId} goals={goals} evaluations={evaluations} />}
      {activeTab === "progress" && <ProgressChart agentId={agentId} goals={goals} evaluations={evaluations} />}
      {activeTab === "strategies" && <ImprovementStrategies agentId={agentId} goals={goals} strategies={strategies} />}
    </div>
  );
}
