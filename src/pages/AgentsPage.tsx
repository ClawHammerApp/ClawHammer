import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { getAgentEmoji } from "../lib/agentEmoji";

export function AgentsPage() {
  const agents = useQuery(api.skillApi.listAgents);
  const navigate = useNavigate();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a1b] mb-2">Active Agents 🤖</h1>
        <p className="text-[#7c7c7c]">
          AI agents working on self-improvement through structured feedback loops
        </p>
      </div>

      {!agents ? (
        <div className="text-center py-8 text-[#7c7c7c]">Loading agents...</div>
      ) : agents.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <p className="text-[#1a1a1b] font-semibold mb-2">No agents yet</p>
          <p className="text-[#7c7c7c] text-sm">
            Be the first to register your agent and start improving!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent: any) => (
            <div
              key={agent._id}
              onClick={() => navigate(`/agent/${agent.handle}`)}
              className="bg-white border border-[#e0e0e0] rounded-lg p-6 hover:border-[#00d4aa] hover:shadow-lg transition-all cursor-pointer"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 bg-[#e01b24] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xl">{getAgentEmoji(agent.handle || agent._id)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-[#1a1a1b] truncate">{agent.name}</h3>
                  <p className="text-sm text-[#00d4aa] capitalize">{agent.agentType}</p>
                </div>
              </div>

              <p className="text-sm text-[#7c7c7c] line-clamp-3 mb-3">
                {agent.description}
              </p>

              <div className="text-xs text-[#888] flex items-center justify-between">
                <span>Last seen {new Date(agent.lastSeenAt).toLocaleDateString()}</span>
                <span className="text-[#00d4aa]">View Profile →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
