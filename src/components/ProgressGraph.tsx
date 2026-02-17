import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useMemo } from 'react';

interface Evaluation {
  _id: string;
  goalId: string;
  selfRating: number;
  headline: string;
  createdAt: number;
}

interface Goal {
  _id: string;
  title: string;
}

interface ProgressGraphProps {
  evaluations: Evaluation[];
  goals: Goal[];
}

export function ProgressGraph({ evaluations, goals }: ProgressGraphProps) {
  const graphData = useMemo(() => {
    // Group evaluations by goal
    const goalMap = new Map<string, { title: string; evals: Evaluation[] }>();
    
    goals.forEach(goal => {
      goalMap.set(goal._id, { title: goal.title, evals: [] });
    });

    evaluations.forEach(ev => {
      const goal = goalMap.get(ev.goalId);
      if (goal) {
        goal.evals.push(ev);
      }
    });

    // Find the goal with the most evaluations (or first active goal)
    let primaryGoal: { title: string; evals: Evaluation[] } | null = null;
    let maxEvals = 0;

    goalMap.forEach(goal => {
      if (goal.evals.length > maxEvals) {
        maxEvals = goal.evals.length;
        primaryGoal = goal;
      }
    });

    if (!primaryGoal || primaryGoal.evals.length === 0) {
      return { data: [], goalTitle: null };
    }

    // Sort evaluations by date and format for chart
    const sortedEvals = [...primaryGoal.evals].sort((a, b) => a.createdAt - b.createdAt);
    
    const data = sortedEvals.map((ev, index) => ({
      index: index + 1,
      rating: ev.selfRating,
      date: new Date(ev.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      headline: ev.headline,
      fullDate: new Date(ev.createdAt).toLocaleString()
    }));

    return { data, goalTitle: primaryGoal.title };
  }, [evaluations, goals]);

  if (graphData.data.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-[#e0e0e0] rounded-lg p-3 shadow-lg max-w-xs">
          <p className="font-bold text-[#1a1a1b] text-sm mb-1">Rating: {data.rating}/10</p>
          <p className="text-xs text-[#555] mb-1">{data.headline}</p>
          <p className="text-xs text-[#888]">{data.fullDate}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <section className="bg-white border border-[#e0e0e0] rounded-lg p-6">
      <h2 className="text-xl font-bold text-[#1a1a1b] mb-2 flex items-center gap-2">
        📈 Progress Over Time
      </h2>
      <p className="text-sm text-[#888] mb-4">
        Tracking: <span className="text-[#1a1a1b] font-medium">{graphData.goalTitle}</span>
      </p>
      
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={graphData.data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="date" 
            stroke="#888"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#888' }}
          />
          <YAxis 
            domain={[0, 10]} 
            ticks={[0, 2, 4, 6, 8, 10]}
            stroke="#888"
            style={{ fontSize: '12px' }}
            tick={{ fill: '#888' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Line 
            type="monotone" 
            dataKey="rating" 
            stroke="#e01b24" 
            strokeWidth={3}
            dot={{ fill: '#e01b24', r: 5 }}
            activeDot={{ r: 7 }}
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-4 flex items-center justify-between text-xs text-[#888]">
        <span>📊 {graphData.data.length} evaluation{graphData.data.length !== 1 ? 's' : ''}</span>
        {graphData.data.length >= 2 && (
          <span>
            {graphData.data[0].rating < graphData.data[graphData.data.length - 1].rating ? (
              <span className="text-[#00d4aa]">↗ Improving</span>
            ) : graphData.data[0].rating > graphData.data[graphData.data.length - 1].rating ? (
              <span className="text-[#e01b24]">↘ Declining</span>
            ) : (
              <span>→ Stable</span>
            )}
          </span>
        )}
      </div>
    </section>
  );
}
