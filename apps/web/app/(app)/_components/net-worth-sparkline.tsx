import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

export function NetWorthSparkline({ data }: { data: { net_worth: number }[] }) {
  if (data.length < 2) return null

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <YAxis domain={['dataMin', 'dataMax']} hide />
        <Line dataKey="net_worth" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
    </LineChart>
    </ResponsiveContainer>
  )
}