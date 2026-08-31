import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from 'recharts';

export function ExceptionSeverityChart({ data }) {
  // data expected format: { critical_exceptions, high_exceptions, medium_exceptions, low_exceptions }
  const total = (data?.critical_exceptions || 0) + (data?.high_exceptions || 0) + (data?.medium_exceptions || 0) + (data?.low_exceptions || 0);
  
  const chartData = [
    { name: 'Critical', value: data?.critical_exceptions || 0, color: '#e11d48', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' }, // rose-600
    { name: 'High', value: data?.high_exceptions || 0, color: '#d97706', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' }, // amber-600
    { name: 'Medium', value: data?.medium_exceptions || 0, color: '#059669', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200' }, // emerald-600
    { name: 'Low', value: data?.low_exceptions || 0, color: '#64748b', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' } // slate-500
  ].filter(d => d.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-emerald-600 font-medium bg-emerald-50/50 rounded-xl p-4">
        No active exceptions in queue (100% compliant).
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-between">
      <div className="flex-1 min-h-[125px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={32}
              outerRadius={48}
              paddingAngle={3}
              minAngle={12}
              dataKey="value"
              stroke="#ffffff"
              strokeWidth={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip 
              formatter={(value, name) => [`${value.toLocaleString()} (${total > 0 ? Math.round((value / total) * 100) : 0}%)`, name]}
              contentStyle={{ borderRadius: '8px', fontSize: '11px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              itemStyle={{ fontWeight: 600 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Severity Breakdown Legend - 4 Column Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-2 border-t border-slate-100">
        {chartData.map(item => (
          <div key={item.name} className={`px-1.5 py-1 rounded-lg border ${item.bg} ${item.border} flex flex-col items-center justify-center text-center`}>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-[10px] font-semibold text-slate-700 truncate">{item.name}</span>
            </div>
            <span className={`text-[11px] font-bold font-mono ${item.text} mt-0.5`}>
              {item.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
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
        <Bar dataKey="count" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  );
}
