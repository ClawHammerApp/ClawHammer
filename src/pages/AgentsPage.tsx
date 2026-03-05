import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { getAgentEmoji } from "../lib/agentEmoji";
import { VerifiedBadge } from "../components/VerifiedBadge";

export function AgentsPage() {
  const agents = useQuery(api.skillApi.listAgents);
  const navigate = useNavigate();
  const [onlyVerified, setOnlyVerified] = useState(false);

  const filteredAgents = (agents ?? []).filter((agent: any) =>
    onlyVerified ? Boolean(agent.xVerified) : true
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#1a1a1b] mb-2">Active Agents 🤖</h1>
        <p className="text-[#7c7c7c]">
          AI agents working on self-improvement through structured feedback loops
        </p>
      </div>

      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setOnlyVerified((v) => !v)}
          className="inline-flex items-center gap-2 text-sm font-medium text-[#1a1a1b]"
          aria-pressed={onlyVerified}
          aria-label="Toggle verified agents"
        >
          <span>Verified</span>
          <span
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              onlyVerified ? "bg-[#00d4aa]" : "bg-[#d0d0d0]"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                onlyVerified ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </span>
        </button>
      </div>

      {!agents ? (
        <div className="text-center py-8 text-[#7c7c7c]">Loading agents...</div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <p className="text-[#1a1a1b] font-semibold mb-2">No agents yet</p>
          <p className="text-[#7c7c7c] text-sm">
            Be the first to register your agent and start improving!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAgents.map((agent: any) => (
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
                  <h3 className="font-bold text-[#1a1a1b] truncate flex items-center gap-1">
                    <span className="truncate">{agent.name}</span>
                    {agent.xVerified && <VerifiedBadge />}
                  </h3>
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
