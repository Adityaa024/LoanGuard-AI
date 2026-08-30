import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

export function ExceptionSeverityChart({ data }) {
  // data expected format: { critical_exceptions, high_exceptions, medium_exceptions }
  const chartData = [
    { name: 'Critical', value: data?.critical_exceptions || 0, color: '#e11d48' }, // rose-600
    { name: 'High', value: data?.high_exceptions || 0, color: '#d97706' }, // amber-600
    { name: 'Medium', value: data?.medium_exceptions || 0, color: '#2563eb' } // blue-600
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-emerald-600 font-medium bg-emerald-50/50 rounded-xl">
        No exceptions found.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={40}
          outerRadius={65}
          paddingAngle={5}
          dataKey="value"
          stroke="none"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <RechartsTooltip 
          contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          itemStyle={{ fontWeight: 600 }}
        />
        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}/>
      </PieChart>
    </ResponsiveContainer>
  );
}

export function PortfolioDistributionChart({ data }) {
  // data expected format: [{ state: 'CA', count: 120 }, { state: 'NY', count: 80 }, ...]
  
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-slate-400 font-medium">
        No state distribution data available.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis 
          dataKey="state" 
          tickLine={false} 
          axisLine={false} 
          tick={{ fontSize: 10, fill: '#64748b' }} 
        />
        <YAxis 
          tickLine={false} 
          axisLine={false} 
          tick={{ fontSize: 10, fill: '#64748b' }} 
        />
        <RechartsTooltip 
          cursor={{ fill: '#f8fafc' }}
          contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
        />
        <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
