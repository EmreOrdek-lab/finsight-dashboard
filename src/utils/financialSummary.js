import { formatMoney, formatPercent } from './formatters';

const EXCLUDED_EXPENSE_CATEGORIES = new Set(['Money In', 'Transfer', 'Credit Card Payment']);

const toNumber = (value) => Number(value || 0);

const buildDailyRows = (transactions, currentDay) => {
    const safeDayCount = Math.max(currentDay, 1);
    const rows = Array.from({ length: safeDayCount }, (_, index) => ({
        day: index + 1,
        income: 0,
        expense: 0,
    }));

    transactions.forEach((transaction) => {
        const transactionDay = toNumber(transaction?.date);
        if(!transactionDay || transactionDay < 1 || transactionDay > safeDayCount){
            return;
        }

        if(transaction.category === 'Money In'){
            rows[transactionDay - 1].income += toNumber(transaction.value);
            return;
        }

        if(!EXCLUDED_EXPENSE_CATEGORIES.has(transaction.category)){
            rows[transactionDay - 1].expense += toNumber(transaction.value);
        }
    });

    return rows;
};

export const buildFinancialSummary = (
    { accounts = [], transactions = [], goals = [], budgets = [] },
    { locale = 'en-US', t = (key, params = {}) => {
        if(key === 'executiveCards.netLiquidityBadge'){
            return `${params.count} accounts`;
        }
        if(key === 'executiveCards.budgetAdherenceBadge'){
            return `${params.count} alerts`;
        }
        if(key === 'executiveCards.liquidityRunwayDays'){
            return `${params.count} days`;
        }
        if(key === 'financialInsights.topSpendCategory'){
            return `${params.category} is currently the highest spend category at ${params.amount}.`;
        }
        if(key === 'financialInsights.budgetPressure'){
            return `${params.category} is tracking at ${params.rate} of budget with ${params.amount} remaining.`;
        }
        if(key === 'financialInsights.goalsFunded'){
            return `Goals are funded at ${params.rate} with ${params.count} targets currently below the 40% confidence threshold.`;
        }
        if(key === 'financialInsights.largestExpense'){
            return `Largest single expense is ${params.name} at ${params.amount} on day ${params.day}.`;
        }
        return key;
    } } = {}
) => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const expenseTransactions = transactions.filter((transaction) => transaction && !EXCLUDED_EXPENSE_CATEGORIES.has(transaction.category));
    const incomeTransactions = transactions.filter((transaction) => transaction && transaction.category === 'Money In');

    const netLiquidity = accounts.reduce((sum, account) => sum + toNumber(account.total), 0);
    const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + toNumber(transaction.value), 0);
    const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + toNumber(transaction.value), 0);
    const savingsEfficiency = totalIncome === 0 ? 0 : ((totalIncome - totalExpenses) / totalIncome) * 100;
    const burnRate = (totalExpenses / Math.max(currentDay, 1)) * daysInMonth;
    const forecastedBalance = netLiquidity + (((totalIncome - totalExpenses) / Math.max(currentDay, 1)) * Math.max(daysInMonth - currentDay, 0));
    const avgDailyExpense = totalExpenses / Math.max(currentDay, 1);
    const runwayDays = avgDailyExpense === 0 ? 0 : netLiquidity / avgDailyExpense;

    const budgetLookup = budgets.reduce((acc, budget) => {
        if(budget?.category){
            acc[budget.category] = {
                planned: toNumber(budget.planned),
                owner: budget.owner || 'Finance Ops',
                criticality: budget.criticality || 'Medium',
            };
        }
        return acc;
    }, {});

    const spendByCategory = expenseTransactions.reduce((acc, transaction) => {
        const category = transaction.category || 'Unassigned';
        acc[category] = (acc[category] || 0) + toNumber(transaction.value);
        return acc;
    }, {});

    const budgetCategories = new Set([
        ...Object.keys(budgetLookup),
        ...Object.keys(spendByCategory),
    ]);

    const budgetRows = Array.from(budgetCategories).sort().map((category) => {
        const planned = budgetLookup[category]?.planned || 0;
        const actual = spendByCategory[category] || 0;
        const variance = planned - actual;
        const utilization = planned === 0 ? (actual > 0 ? 100 : 0) : (actual / planned) * 100;
        let status = 'On track';

        if(planned === 0 && actual > 0){
            status = 'Unbudgeted';
        } else if(actual > planned * 1.1){
            status = 'Over budget';
        } else if(actual > planned){
            status = 'Watchlist';
        }

        return {
            id: `budget-${category.toLowerCase().replace(/\s+/g, '-')}`,
            category,
            planned,
            actual,
            variance,
            utilization,
            status,
            owner: budgetLookup[category]?.owner || 'Finance Ops',
            criticality: budgetLookup[category]?.criticality || 'Medium',
        };
    });

    const plannedBudget = budgetRows.reduce((sum, row) => sum + row.planned, 0);
    const remainingBudget = plannedBudget - totalExpenses;
    const budgetAdherenceRate = plannedBudget === 0 ? 0 : (totalExpenses / plannedBudget) * 100;
    const overBudgetCount = budgetRows.filter((row) => row.status === 'Over budget').length;
    const unbudgetedCount = budgetRows.filter((row) => row.status === 'Unbudgeted').length;

    const totalGoalTarget = goals.reduce((sum, goal) => sum + toNumber(goal.total), 0);
    const totalGoalCurrent = goals.reduce((sum, goal) => sum + toNumber(goal.current), 0);
    const fundedGoalsRatio = totalGoalTarget === 0 ? 0 : (totalGoalCurrent / totalGoalTarget) * 100;
    const goalsAtRisk = goals.filter((goal) => {
        const total = toNumber(goal.total);
        return total > 0 && (toNumber(goal.current) / total) * 100 < 40;
    }).length;

    const openingLiquidity = netLiquidity - (totalIncome - totalExpenses);
    const dailyRows = buildDailyRows(transactions, currentDay);
    let runningIncome = 0;
    let runningExpense = 0;
    let runningLiquidity = openingLiquidity;

    const liquidityTrend = [];
    const burnTrend = [];
    const savingsTrend = [];
    const forecastTrend = [];
    const budgetTrend = [];
    const runwayTrend = [];

    dailyRows.forEach((row, index) => {
        runningIncome += row.income;
        runningExpense += row.expense;
        runningLiquidity += row.income - row.expense;

        const elapsedDays = index + 1;
        const projectedBurn = (runningExpense / elapsedDays) * daysInMonth;
        const runningEfficiency = runningIncome === 0 ? 0 : ((runningIncome - runningExpense) / runningIncome) * 100;
        const projectedForecast = netLiquidity + (((runningIncome - runningExpense) / elapsedDays) * Math.max(daysInMonth - elapsedDays, 0));
        const proratedBudget = plannedBudget === 0 ? 0 : (plannedBudget / daysInMonth) * elapsedDays;
        const budgetPulse = proratedBudget === 0 ? 0 : (runningExpense / proratedBudget) * 100;
        const runwayPulse = runningExpense === 0 ? 0 : runningLiquidity / Math.max(runningExpense / elapsedDays, 1);

        liquidityTrend.push({ day: row.day, value: Number(runningLiquidity.toFixed(2)) });
        burnTrend.push({ day: row.day, value: Number(projectedBurn.toFixed(2)) });
        savingsTrend.push({ day: row.day, value: Number(runningEfficiency.toFixed(2)) });
        forecastTrend.push({ day: row.day, value: Number(projectedForecast.toFixed(2)) });
        budgetTrend.push({ day: row.day, value: Number(budgetPulse.toFixed(2)) });
        runwayTrend.push({ day: row.day, value: Number(Math.max(runwayPulse, 0).toFixed(2)) });
    });

    const cards = [
        {
            label: t('executiveCards.netLiquidity'),
            value: formatMoney(netLiquidity, 'USD', locale),
            badge: t('executiveCards.netLiquidityBadge', { count: accounts.length }),
            detail: t('executiveCards.netLiquidityDetail'),
            tone: netLiquidity >= 0 ? 'positive' : 'negative',
            sparkline: liquidityTrend.length ? liquidityTrend : [{ day: 1, value: 0 }],
        },
        {
            label: t('executiveCards.burnRate'),
            value: formatMoney(burnRate, 'USD', locale),
            badge: t('executiveCards.burnRateBadge'),
            detail: t('executiveCards.burnRateDetail'),
            tone: totalIncome >= burnRate ? 'neutral' : 'negative',
            sparkline: burnTrend.length ? burnTrend : [{ day: 1, value: 0 }],
        },
        {
            label: t('executiveCards.savingsEfficiency'),
            value: formatPercent(savingsEfficiency, 1, locale),
            badge: t('executiveCards.savingsEfficiencyBadge'),
            detail: t('executiveCards.savingsEfficiencyDetail'),
            tone: savingsEfficiency >= 20 ? 'positive' : 'negative',
            sparkline: savingsTrend.length ? savingsTrend : [{ day: 1, value: 0 }],
        },
        {
            label: t('executiveCards.forecastedBalance'),
            value: formatMoney(forecastedBalance, 'USD', locale),
            badge: t('executiveCards.forecastedBalanceBadge'),
            detail: t('executiveCards.forecastedBalanceDetail'),
            tone: forecastedBalance >= 0 ? 'positive' : 'negative',
            sparkline: forecastTrend.length ? forecastTrend : [{ day: 1, value: 0 }],
        },
        {
            label: t('executiveCards.budgetAdherence'),
            value: plannedBudget > 0 ? formatPercent(budgetAdherenceRate, 1, locale) : t('executiveCards.budgetAdherenceNoPlan'),
            badge: plannedBudget > 0 ? t('executiveCards.budgetAdherenceBadge', { count: overBudgetCount }) : t('executiveCards.budgetAdherencePending'),
            detail: t('executiveCards.budgetAdherenceDetail'),
            tone: plannedBudget === 0 ? 'neutral' : budgetAdherenceRate <= 100 ? 'positive' : 'negative',
            sparkline: budgetTrend.length ? budgetTrend : [{ day: 1, value: 0 }],
        },
        {
            label: t('executiveCards.liquidityRunway'),
            value: avgDailyExpense === 0 ? t('executiveCards.liquidityRunwayStable') : t('executiveCards.liquidityRunwayDays', { count: Math.max(runwayDays, 0).toFixed(0) }),
            badge: avgDailyExpense === 0 ? t('executiveCards.liquidityRunwayNoBurn') : t('executiveCards.liquidityRunwayCurrentPace'),
            detail: t('executiveCards.liquidityRunwayDetail'),
            tone: runwayDays >= 45 ? 'positive' : runwayDays >= 20 ? 'neutral' : 'negative',
            sparkline: runwayTrend.length ? runwayTrend : [{ day: 1, value: 0 }],
        },
    ];

    const largestExpense = expenseTransactions.slice().sort((a, b) => toNumber(b.value) - toNumber(a.value))[0];
    const topBudgetPressure = budgetRows.slice().sort((a, b) => b.utilization - a.utilization)[0];
    const topSpendCategory = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0];
    const budgetCoverage = plannedBudget === 0 ? 0 : Math.max(((plannedBudget - totalExpenses) / plannedBudget) * 100, 0);

    const insights = [
        topSpendCategory
            ? t('financialInsights.topSpendCategory', { category: topSpendCategory[0], amount: formatMoney(topSpendCategory[1], 'USD', locale) })
            : t('financialInsights.expenseMixPending'),
        topBudgetPressure
            ? t('financialInsights.budgetPressure', {
                category: topBudgetPressure.category,
                rate: formatPercent(topBudgetPressure.utilization, 1, locale),
                amount: formatMoney(topBudgetPressure.variance, 'USD', locale),
            })
            : t('financialInsights.budgetPressurePending'),
        totalGoalTarget > 0
            ? t('financialInsights.goalsFunded', { rate: formatPercent(fundedGoalsRatio, 1, locale), count: goalsAtRisk })
            : t('financialInsights.goalsPending'),
        largestExpense
            ? t('financialInsights.largestExpense', {
                name: largestExpense.name,
                amount: formatMoney(largestExpense.value, 'USD', locale),
                day: largestExpense.date,
            })
            : t('financialInsights.largestExpensePending'),
    ];

    return {
        cards,
        budgetRows,
        governance: {
            plannedBudget,
            totalExpenses,
            totalIncome,
            remainingBudget,
            budgetAdherenceRate,
            budgetCoverage,
            overBudgetCount,
            unbudgetedCount,
            runwayDays,
            fundedGoalsRatio,
            goalsAtRisk,
            avgDailyExpense,
        },
        insights,
    };
};
