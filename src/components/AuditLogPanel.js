import React, { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import { formatRelativeTime, formatTimestamp } from '../utils/formatters';
import { useLanguage } from '../context/LanguageContext';
import { getRoleKey } from '../i18n/helpers';

function AuditLogPanel(props) {
    const { t, locale } = useLanguage();
    const [ filter, setFilter ] = useState('all');

    const filteredEntries = useMemo(() => {
        if(filter === 'all'){
            return props.auditEntries;
        }
        return props.auditEntries.filter((entry) => entry.domain === filter);
    }, [filter, props.auditEntries]);

    const filters = ['all', 'access', 'budgets', 'transactions', 'goals', 'accounts', 'workspace'];

    if(!props.permissions.viewAuditLogs){
        return (
            <section id="audit" className="enterprise-panel order-9 flex flex-col gap-4 p-6 xl:col-span-12">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('audit.eyebrow')}
                    </div>
                    <h2 className="pt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('audit.protectedTitle')}</h2>
                </div>
                <div className="enterprise-stat-card px-4 py-4 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                    {t('audit.protectedBody')}
                </div>
            </section>
        );
    }

    return (
        <section id="audit" className="enterprise-panel order-9 flex flex-col gap-4 p-6 xl:col-span-12">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('audit.eyebrow')}
                    </div>
                    <h2 className="pt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('audit.title')}</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                    {filters.map((item) => (
                        <Button
                            key={item}
                            size="small"
                            sx={props.buttonStyles}
                            onClick={() => setFilter(item)}
                            variant={filter === item ? 'contained' : 'outlined'}>
                            {t(`audit.filters.${item}`)}
                        </Button>
                    ))}
                </div>
            </div>
            <div className="grid gap-3">
                {filteredEntries.length === 0 ? (
                    <div className="enterprise-stat-card px-4 py-4 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {t('audit.empty')}
                    </div>
                ) : (
                    filteredEntries.slice(0, 12).map((entry, index) => (
                        <article key={`${entry.createdAt}-${index}`} className="enterprise-stat-card px-4 py-4">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                                <div>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-300">
                                            {entry.action}
                                        </span>
                                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
                                            {entry.domain}
                                        </span>
                                        <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
                                            {t(getRoleKey(entry.actorRole))}
                                        </span>
                                    </div>
                                    <div className="pt-2 text-base font-semibold text-slate-900 dark:text-slate-100">
                                        {entry.summary}
                                    </div>
                                </div>
                                <div className="text-right text-sm text-slate-500 dark:text-zinc-500">
                                    <div>{formatRelativeTime(entry.createdAt, locale)}</div>
                                    <div>{formatTimestamp(entry.createdAt, locale)}</div>
                                </div>
                            </div>
                        </article>
                    ))
                )}
            </div>
        </section>
    );
}

export default AuditLogPanel;
