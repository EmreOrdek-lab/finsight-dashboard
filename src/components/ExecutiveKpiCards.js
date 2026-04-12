import React from 'react';
import { ResponsiveContainer, LineChart, Line } from 'recharts';

function ExecutiveKpiCards(props) {
    const getTrendColor = (tone) => {
        if(tone === 'negative'){
            return '#dc2626';
        }
        if(tone === 'positive'){
            return '#059669';
        }
        return '#64748b';
    };

    return (
        <section id="executive-kpis" className="xl:col-span-12">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:gap-6 xl:grid-cols-3 2xl:grid-cols-6">
                {props.cards.map((card) => (
                    <article key={card.label} className="enterprise-panel flex min-h-[176px] flex-col justify-between p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                                    {card.label}
                                </div>
                                <div className={`pt-3 text-2xl font-semibold tracking-tight ${card.tone === 'negative' ? 'text-red-600' : card.tone === 'positive' ? 'text-emerald-600' : 'text-slate-900 dark:text-slate-100'}`}>
                                    {card.value}
                                </div>
                            </div>
                            <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${card.tone === 'negative' ? 'bg-red-50 text-red-600 dark:bg-red-950/40' : card.tone === 'positive' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40' : 'bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-400'}`}>
                                {card.badge}
                            </div>
                        </div>
                        <div className="mt-3 h-14 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={card.sparkline}>
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={getTrendColor(card.tone)}
                                        strokeWidth={2.2}
                                        dot={false}
                                        isAnimationActive={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="pt-2 text-xs leading-5 text-slate-600 dark:text-zinc-400">
                            {card.detail}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}

export default ExecutiveKpiCards;
