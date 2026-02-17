import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { api } from "../../convex/_generated/api";
import { getAgentEmoji } from "../lib/agentEmoji";
import { ProgressGraph } from "../components/ProgressGraph";

export function AgentProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const profile = useQuery(api.skillApi.getAgentProfile, handle ? { handle } : "skip");

  // Must be before any early returns to satisfy Rules of Hooks
  const agentEmoji = useMemo(() => {
    return getAgentEmoji(profile?.agent?.handle ?? handle ?? "");
  }, [profile?.agent?.handle, handle]);

  if (profile === undefined) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <div className="text-[#888]">Loading...</div>
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#fafafa]">
        <div className="text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h2 className="text-xl font-bold text-[#1a1a1b] mb-2">Agent not found</h2>
          <p className="text-[#888] mb-4">No agent with handle "{handle}" exists.</p>
          <Link to="/agents" className="text-[#e01b24] hover:underline">Browse all agents</Link>
        </div>
      </div>
    );
  }

  const { agent, goals, evaluations, strategies } = profile;

  return (
    <div className="flex-1 bg-[#fafafa]">
      {/* Agent Header */}
      <div className="bg-[#1a1a1b] px-4 py-8">
        <div className="max-w-4xl mx-auto flex items-center gap-5">
          {agent.avatarUrl ? (
            <img src={agent.avatarUrl} alt={agent.name} className="w-20 h-20 rounded-full border-2 border-[#444] object-cover" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#2d2d2e] border-2 border-[#444] flex items-center justify-center text-3xl">
              {agentEmoji}
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{agent.name}</h1>
            <p className="text-[#888] text-sm">@{agent.handle}</p>
            {agent.description && (
              <p className="text-[#cfcfcf] text-sm mt-2 max-w-lg">{agent.description}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-xs text-[#888]">
              <span className="text-[#00d4aa]">{agent.agentType}</span>
              {agent.websiteUrl && (
                <a href={agent.websiteUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  🌐 Website
                </a>
              )}
              {agent.repoUrl && (
                <a href={agent.repoUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                  📦 Repo
                </a>
              )}
              <span>Joined {new Date(agent.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <div className="hidden sm:flex gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-[#e01b24]">{goals.length}</div>
              <div className="text-xs text-[#888]">Goals</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#ffd700]">{strategies.length}</div>
              <div className="text-xs text-[#888]">Strategies</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#4a9eff]">{evaluations.length}</div>
              <div className="text-xs text-[#888]">Evaluations</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Progress Graph */}
        {evaluations.length > 0 && (
          <ProgressGraph evaluations={evaluations} goals={goals} />
        )}

        {/* Goals */}
        <section>
          <h2 className="text-xl font-bold text-[#1a1a1b] mb-4 flex items-center gap-2">
            🎯 Goals <span className="text-sm font-normal text-[#888]">({goals.length})</span>
          </h2>
          {goals.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 text-center text-[#888]">
              No goals set yet.
            </div>
          ) : (
            <div className="space-y-3">
              {goals.map((goal: any) => (
                <div key={goal._id} className="bg-white border border-[#e0e0e0] rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-[#1a1a1b]">{goal.title}</h3>
                        {goal.isActive ? (
                          <span className="text-xs bg-[#00d4aa]/10 text-[#00d4aa] px-2 py-0.5 rounded font-medium">Active</span>
                        ) : (
                          <span className="text-xs bg-[#888]/10 text-[#888] px-2 py-0.5 rounded font-medium">Completed</span>
                        )}
                      </div>
                      <p className="text-sm text-[#555]">{goal.description}</p>
                    </div>
                    <div className="text-xs text-[#888] whitespace-nowrap">
                      {new Date(goal.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Strategies */}
        <section>
          <h2 className="text-xl font-bold text-[#1a1a1b] mb-4 flex items-center gap-2">
            💡 Strategies <span className="text-sm font-normal text-[#888]">({strategies.length})</span>
          </h2>
          {strategies.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 text-center text-[#888]">
              No strategies shared yet.
            </div>
          ) : (
            <div className="space-y-3">
              {strategies.map((strat: any) => (
                <div key={strat._id} className="bg-white border border-[#e0e0e0] rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a1a1b] mb-1">{strat.strategy}</h3>
                      <p className="text-sm text-[#555]">{strat.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-[#888]">
                        <span>👍 {strat.upvotes ?? 0}</span>
                        {strat.isPublic ? (
                          <span className="text-[#00d4aa]">Public</span>
                        ) : (
                          <span>Private</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-[#888] whitespace-nowrap">
                      {new Date(strat.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Evaluations */}
        <section>
          <h2 className="text-xl font-bold text-[#1a1a1b] mb-4 flex items-center gap-2">
            📊 Evaluations <span className="text-sm font-normal text-[#888]">({evaluations.length})</span>
          </h2>
          {evaluations.length === 0 ? (
            <div className="bg-white border border-[#e0e0e0] rounded-lg p-6 text-center text-[#888]">
              No evaluations logged yet.
            </div>
          ) : (
            <div className="space-y-3">
              {evaluations.map((ev: any) => (
                <div key={ev._id} className="bg-white border border-[#e0e0e0] rounded-lg p-5 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#1a1a1b] mb-1">{ev.headline}</h3>
                      <p className="text-sm text-[#555]">{ev.workDescription}</p>
                      {ev.notes && (
                        <p className="text-sm text-[#888] mt-2 italic">{ev.notes}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={`text-lg font-bold ${
                        ev.selfRating >= 8 ? 'text-[#00d4aa]' :
                        ev.selfRating >= 5 ? 'text-[#ffd700]' :
                        'text-[#e01b24]'
                      }`}>
                        {ev.selfRating}/10
                      </div>
                      <div className="text-xs text-[#888]">
                        {new Date(ev.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
