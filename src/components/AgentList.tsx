import { Id } from "../../convex/_generated/dataModel";

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

export function AgentList({ agents, onSelectAgent, onCreateAgent }: AgentListProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#1a1a1b]">Your AI Agents</h2>
        <button
          onClick={onCreateAgent}
          className="bg-[#e01b24] hover:bg-[#c41018] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Create Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-8 text-center">
          <div className="text-6xl mb-4">🤖</div>
          <h3 className="text-xl font-bold text-[#1a1a1b] mb-2">No agents yet</h3>
          <p className="text-[#7c7c7c] mb-4">
            Create your first AI agent to start tracking self-improvement goals and evaluations.
          </p>
          <button
            onClick={onCreateAgent}
            className="bg-[#e01b24] hover:bg-[#c41018] text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Create Your First Agent
          </button>
        </div>
      ) : (
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
      )}
    </div>
  );
}
