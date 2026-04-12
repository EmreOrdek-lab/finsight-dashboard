import React, { useMemo, useState } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import TextField from '@mui/material/TextField';
import { formatMoney, formatPercent } from '../utils/formatters';
import { DEFAULT_BUDGET_TEMPLATES, removeBudgetItem, upsertBudgetItem } from '../services/workspaceGovernanceService';
import { useLanguage } from '../context/LanguageContext';
import { getBudgetStatusKey, getCriticalityKey } from '../i18n/helpers';

function BudgetPerformancePanel(props) {
    const { t, locale } = useLanguage();
    const canManageBudgets = props.permissions.manageBudgets;
    const [ formValues, setFormValues ] = useState({
        firebaseKey: null,
        category: null,
        planned: '',
        owner: 'Finance Ops',
        criticality: 'Medium',
    });
    const [ formError, setFormError ] = useState('');
    const [ message, setMessage ] = useState('');

    const displayRows = useMemo(() => {
        return props.summary.budgetRows.map((row) => {
            const matchingBudget = props.budgets.find((budget) => budget.category === row.category);
            return {
                ...row,
                firebaseKey: matchingBudget?.firebaseKey || null,
                owner: matchingBudget?.owner || row.owner,
                criticality: matchingBudget?.criticality || row.criticality,
                planned: matchingBudget?.planned ?? row.planned,
            };
        });
    }, [props.budgets, props.summary.budgetRows]);

    const categoryOptions = useMemo(() => {
        return [...new Set([
            ...DEFAULT_BUDGET_TEMPLATES.map((item) => item.category),
            ...displayRows.map((row) => row.category),
        ])];
    }, [displayRows]);

    const criticalityOptions = ['Low', 'Medium', 'High'];

    const resetForm = () => {
        setFormValues({
            firebaseKey: null,
            category: null,
            planned: '',
            owner: 'Finance Ops',
            criticality: 'Medium',
        });
        setFormError('');
    };

    const handleSave = async (event) => {
        event.preventDefault();
        if(!canManageBudgets){
            return;
        }

        if(!formValues.category || Number(formValues.planned) <= 0){
            setFormError(t('budgetPanel.createOrUpdateError'));
            return;
        }

        await upsertBudgetItem(props.userId, {
            ...formValues,
            category: formValues.category,
            planned: Number(formValues.planned),
            owner: formValues.owner,
            criticality: formValues.criticality,
        }, props.baseRole);
        setMessage(formValues.firebaseKey ? t('budgetPanel.budgetUpdated') : t('budgetPanel.budgetCreated'));
        resetForm();
    };

    const handleDelete = async (budget) => {
        if(!canManageBudgets){
            return;
        }

        await removeBudgetItem(props.userId, budget, props.baseRole);
        setMessage(t('budgetPanel.budgetRemoved'));
        if(formValues.firebaseKey === budget.firebaseKey){
            resetForm();
        }
    };

    const startEdit = (budget) => {
        setFormValues({
            firebaseKey: budget.firebaseKey,
            category: budget.category,
            planned: String(budget.planned),
            owner: budget.owner || 'Finance Ops',
            criticality: budget.criticality || 'Medium',
        });
        setFormError('');
        setMessage(t('budgetPanel.editingBudget', { category: budget.category }));
    };

    const getProgressTone = (status) => {
        if(status === 'Over budget'){
            return '#dc2626';
        }
        if(status === 'Watchlist'){
            return '#d97706';
        }
        if(status === 'Unbudgeted'){
            return '#64748b';
        }
        return '#059669';
    };

    return (
        <section id="budgets" className="enterprise-panel order-6 flex flex-col gap-5 p-6 xl:col-span-7">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('budgetPanel.eyebrow')}
                    </div>
                    <h2 className="pt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('budgetPanel.title')}</h2>
                    <p className="pt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {t('budgetPanel.description')}
                    </p>
                </div>
                <div className="grid w-full gap-2 sm:grid-cols-2 xl:w-auto xl:min-w-[22rem]">
                    <div className="enterprise-stat-card min-w-0 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">{t('common.planned')}</div>
                        <div className="pt-1 text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100 sm:text-lg">
                            {formatMoney(props.summary.governance.plannedBudget, 'USD', locale)}
                        </div>
                    </div>
                    <div className="enterprise-stat-card min-w-0 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">{t('common.actual')}</div>
                        <div className="pt-1 text-base font-semibold tabular-nums text-slate-900 dark:text-slate-100 sm:text-lg">
                            {formatMoney(props.summary.governance.totalExpenses, 'USD', locale)}
                        </div>
                    </div>
                    <div className="enterprise-stat-card min-w-0 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">{t('common.remaining')}</div>
                        <div className={`pt-1 text-base font-semibold tabular-nums sm:text-lg ${props.summary.governance.remainingBudget >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {formatMoney(props.summary.governance.remainingBudget, 'USD', locale)}
                        </div>
                    </div>
                    <div className="enterprise-stat-card min-w-0 px-3 py-3">
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">{t('common.adherence')}</div>
                        <div className={`pt-1 text-base font-semibold tabular-nums sm:text-lg ${props.summary.governance.budgetAdherenceRate <= 100 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {props.summary.governance.plannedBudget > 0 ? formatPercent(props.summary.governance.budgetAdherenceRate, 1, locale) : t('common.notSet')}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
                <div className="flex flex-col gap-3">
                    {displayRows.length === 0 ? (
                        <div className="enterprise-stat-card px-4 py-4 text-sm text-slate-600 dark:text-zinc-400">
                            {t('budgetPanel.empty')}
                        </div>
                    ) : (
                        displayRows.map((row) => (
                            <article key={row.id} className="enterprise-stat-card px-4 py-4">
                                <div className="flex flex-col gap-3">
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{row.category}</h3>
                                            <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${
                                                row.status === 'Over budget'
                                                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                                                    : row.status === 'Watchlist'
                                                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                                                        : row.status === 'Unbudgeted'
                                                            ? 'bg-slate-100 text-slate-600 dark:bg-zinc-900 dark:text-zinc-300'
                                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                                            }`}>
                                                {t(getBudgetStatusKey(row.status))}
                                            </span>
                                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-zinc-700 dark:text-zinc-400">
                                                {t(getCriticalityKey(row.criticality))}
                                            </span>
                                        </div>
                                        <div className="pt-1 text-xs text-slate-500 dark:text-zinc-500">
                                            {t('budgetPanel.owner', { owner: row.owner })}
                                        </div>
                                    </div>
                                    <div className="grid gap-2 text-sm text-slate-600 dark:text-zinc-400 sm:grid-cols-2 2xl:grid-cols-3">
                                        <div className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-2 dark:bg-zinc-900/60">
                                            <div className="text-[11px] uppercase tracking-[0.16em]">{t('common.planned')}</div>
                                            <div className="pt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(row.planned, 'USD', locale)}</div>
                                        </div>
                                        <div className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-2 dark:bg-zinc-900/60">
                                            <div className="text-[11px] uppercase tracking-[0.16em]">{t('common.actual')}</div>
                                            <div className="pt-1 font-semibold tabular-nums text-slate-900 dark:text-slate-100">{formatMoney(row.actual, 'USD', locale)}</div>
                                        </div>
                                        <div className="min-w-0 rounded-xl bg-slate-50/70 px-3 py-2 dark:bg-zinc-900/60 sm:col-span-2 2xl:col-span-1">
                                            <div className="text-[11px] uppercase tracking-[0.16em]">{t('common.variance')}</div>
                                            <div className={`pt-1 font-semibold tabular-nums ${row.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                {formatMoney(row.variance, 'USD', locale)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-3">
                                    <div className="flex items-center justify-between pb-2 text-xs font-medium text-slate-500 dark:text-zinc-400">
                                        <span>{t('common.utilization')}</span>
                                        <span>{formatPercent(row.utilization, 1, locale)}</span>
                                    </div>
                                    <LinearProgress
                                        variant="determinate"
                                        value={Math.min(row.utilization, 100)}
                                        sx={{
                                            height: 10,
                                            borderRadius: 999,
                                            backgroundColor: props.theme === 'dark' ? '#27272a' : '#e2e8f0',
                                            '& .MuiLinearProgress-bar': {
                                                backgroundColor: getProgressTone(row.status),
                                            },
                                        }}
                                    />
                                </div>
                                {canManageBudgets && (
                                    <div className="flex justify-end gap-2 pt-3">
                                        <Button size="small" sx={props.buttonStyles} onClick={() => startEdit(row)}>
                                            {t('common.edit')}
                                        </Button>
                                        <Button size="small" sx={props.buttonStyles} disabled={!row.firebaseKey} onClick={() => handleDelete(row)}>
                                            {t('common.delete')}
                                        </Button>
                                    </div>
                                )}
                            </article>
                        ))
                    )}
                </div>

                <aside className="enterprise-stat-card p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                                {t('budgetPanel.manager')}
                            </div>
                            <h3 className="pt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                                {canManageBudgets ? t('common.planCategories') : t('common.readOnlyRole')}
                            </h3>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                            {props.summarySource}
                        </span>
                    </div>
                    <p className="pt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {canManageBudgets
                            ? t('budgetPanel.manageDescription')
                            : t('budgetPanel.readOnlyDescription')}
                    </p>
                    {message && (
                        <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                            {message}
                        </div>
                    )}
                    {canManageBudgets && (
                        <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
                            <Autocomplete
                                options={categoryOptions}
                                value={formValues.category}
                                onChange={(event, newValue) => setFormValues((current) => ({ ...current, category: newValue }))}
                                renderInput={(params) => <TextField {...params} label={t('common.category')} variant="filled" size="small" sx={props.inputStyles} />}
                            />
                            <TextField
                                label={t('common.plannedAmount')}
                                variant="filled"
                                size="small"
                                type="number"
                                sx={props.inputStyles}
                                value={formValues.planned}
                                onChange={(event) => setFormValues((current) => ({ ...current, planned: event.target.value }))}
                            />
                            <TextField
                                label={t('common.budgetOwner')}
                                variant="filled"
                                size="small"
                                sx={props.inputStyles}
                                value={formValues.owner}
                                onChange={(event) => setFormValues((current) => ({ ...current, owner: event.target.value }))}
                            />
                            <Autocomplete
                                options={criticalityOptions}
                                value={formValues.criticality}
                                onChange={(event, newValue) => setFormValues((current) => ({ ...current, criticality: newValue || 'Medium' }))}
                                getOptionLabel={(option) => t(getCriticalityKey(option))}
                                renderInput={(params) => <TextField {...params} label={t('common.criticality')} variant="filled" size="small" sx={props.inputStyles} />}
                            />
                            {formError && (
                                <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                                    {formError}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <Button type="submit" sx={props.buttonStyles}>
                                    {formValues.firebaseKey ? t('budgetPanel.saveChanges') : t('budgetPanel.createBudget')}
                                </Button>
                                <Button type="button" sx={props.buttonStyles} onClick={() => resetForm()}>
                                    {t('common.clear')}
                                </Button>
                            </div>
                        </form>
                    )}
                </aside>
            </div>
        </section>
    );
}

export default BudgetPerformancePanel;
