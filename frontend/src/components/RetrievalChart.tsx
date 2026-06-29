import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type RetrievalItem = { source: string; score: number };

export function RetrievalChart({ data, color }: { data: RetrievalItem[]; color: string }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ width: '100%', height: 24 + data.length * 34 }}>
      <ResponsiveContainer>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ left: 0, right: 28, top: 4, bottom: 4 }}
        >
          <XAxis type="number" domain={[0, 1]} hide />
          <YAxis
            type="category"
            dataKey="source"
            width={72}
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 11, fontWeight: 600, fill: 'var(--text-main)' }}
          />
        <Tooltip
            cursor={{ fill: 'transparent' }}
            contentStyle={{
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${(Number(value) * 100).toFixed(0)}%`, 'relevance']}
          />
          <Bar dataKey="score" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}