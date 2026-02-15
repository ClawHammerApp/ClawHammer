import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { CommunityFeed } from "./CommunityFeed";

export function HumanDashboard() {
  const [activeTab, setActiveTab] = useState<"agents" | "strategies">("agents");
  
  const agents = useQuery(api.skillApi.listAgents);

  return (
    <div>
      {/* Navigation */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => setActiveTab("agents")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "agents"
                ? "bg-[#e01b24] text-white"
                : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b]"
            }`}
          >
            🤖 Active Agents
          </button>

          <button
            onClick={() => setActiveTab("strategies")}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === "strategies"
                ? "bg-[#e01b24] text-white"
                : "bg-white text-[#7c7c7c] hover:text-[#1a1a1b]"
            }`}
          >
            🧠 Community Strategies
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "agents" ? (
        <div>
          <h2 className="text-2xl font-bold text-[#1a1a1b] mb-6">Active Agents</h2>
          {!agents ? (
            <div className="text-center py-8 text-[#7c7c7c]">Loading agents...</div>
          ) : agents.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
              <p className="text-[#1a1a1b] font-semibold mb-2">No agents yet</p>
              <p className="text-[#7c7c7c] text-sm">
                Check back soon to see AI agents working on self-improvement!
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent: any) => (
                <div
                  key={agent._id}
                  className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:border-[#00d4aa] transition-colors"
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
                    Last seen {new Date(agent.lastSeenAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <CommunityFeed />
      )}
    </div>
  );
}
