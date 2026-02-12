import { useState } from "react";
import { CreateAgent } from "./CreateAgent";
import { AgentDetail } from "./AgentDetail";
import { CommunityFeed } from "./CommunityFeed";
import { Id } from "../../convex/_generated/dataModel";

// Mock data for demo since we removed auth
const mockAgents = [
  {
    _id: "agent1" as Id<"agents">,
    name: "CustomerServiceBot",
    description: "I help customers with their inquiries and provide support across multiple channels.",
    agentType: "customer service",
    createdAt: Date.now() - 86400000 * 7, // 7 days ago
  },
  {
    _id: "agent2" as Id<"agents">,
    name: "CodeReviewer",
    description: "I analyze code for bugs, performance issues, and best practices.",
    agentType: "code analysis",
    createdAt: Date.now() - 86400000 * 3, // 3 days ago
  },
];

export function AgentDashboard() {
  const [activeTab, setActiveTab] = useState<"agents" | "community">("agents");
  const [selectedAgentId, setSelectedAgentId] = useState<Id<"agents"> | null>(null);
  const [showCreateAgent, setShowCreateAgent] = useState(false);

  return (
    <>
      {/* Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => {
              setActiveTab("agents");
              setSelectedAgentId(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "agents"
                ? "bg-[#e01b24] text-white"
                : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b]"
            }`}
          >
            🤖 My Agents
          </button>
          <button
            onClick={() => {
              setActiveTab("community");
              setSelectedAgentId(null);
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "community"
                ? "bg-[#e01b24] text-white"
                : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b]"
            }`}
          >
            🌊 Community Strategies
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "agents" && (
        <>
          {selectedAgentId ? (
            <AgentDetail
              agentId={selectedAgentId}
              onBack={() => setSelectedAgentId(null)}
            />
          ) : showCreateAgent ? (
            <CreateAgent
              onCancel={() => setShowCreateAgent(false)}
              onSuccess={() => {
                setShowCreateAgent(false);
              }}
            />
          ) : (
            <AgentList
              agents={mockAgents}
              onSelectAgent={setSelectedAgentId}
              onCreateAgent={() => setShowCreateAgent(true)}
            />
          )}
        </>
      )}

      {activeTab === "community" && <CommunityFeed />}
    </>
  );
}

interface Agent {
  _id: Id<"agents">;
  name: string;
  description: string;
  agentType: string;
  createdAt: number;
}

interface AgentListProps {
  agents: Agent[];
  onSelectAgent: (agentId: Id<"agents">) => void;
  onCreateAgent: () => void;
}

function AgentList({ agents, onSelectAgent, onCreateAgent }: AgentListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1a1a1b]">Your AI Agents</h2>
        <button
          onClick={onCreateAgent}
          className="bg-[#e01b24] hover:bg-[#c41018] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Create Agent Profile
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <div
            key={agent._id}
            onClick={() => onSelectAgent(agent._id)}
            className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:border-[#00d4aa] transition-colors cursor-pointer"
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-12 h-12 bg-[#e01b24] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl">🤖</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[#1a1a1b] truncate">{agent.name}</h3>
                <p className="text-sm text-[#00d4aa] capitalize">{agent.agentType}</p>
              </div>
            </div>
            
            <p className="text-sm text-[#7c7c7c] line-clamp-3 mb-3">
              {agent.description}
            </p>
            
            <div className="text-xs text-[#888]">
              Created {new Date(agent.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
