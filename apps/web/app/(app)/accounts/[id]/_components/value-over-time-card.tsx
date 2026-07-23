import { Card, CardContent } from '@/components/ui/card'
import { LineChart as LineChartIcon } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import { CardSectionHeader } from '@/components/card-section-header'
import type { components } from '@finance-app/api-spec'

type AccountSnapshot = components['schemas']['AccountSnapshot']

const chartConfig = {
  balance: { label: 'Balance', color: 'var(--color-accent)' },
} satisfies ChartConfig

export function ValueOverTimeCard({ snapshots }: { snapshots: AccountSnapshot[] }) {
  const chartData = [...snapshots]
    .reverse()
    .map((s) => ({
      date: new Date(s.as_of_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      balance: s.balance,
    }))

  return (
    <Card className="lg:col-span-2 p-6 flex flex-col">
      <CardContent className="p-0 flex flex-col flex-1">
        <CardSectionHeader icon={LineChartIcon} title="Value Over Time" />
        {chartData.length < 2 ? (
          <p className="text-text-muted text-base">Not enough history yet to chart a trend.</p>
        ) : (
          <ChartContainer config={chartConfig} className="w-full h-[320px]">
            <LineChart data={chartData}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={13} />
              <YAxis
                tickLine={false}
                axisLine={false}
                fontSize={13}
                tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line
                dataKey="balance"
                stroke="var(--color-balance)"
                strokeWidth={2}
                dot={{ r: 4, fill: 'var(--color-balance)', strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}