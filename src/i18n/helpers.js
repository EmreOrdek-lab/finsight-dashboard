export const getSummarySourceKey = (value) => {
    if(value === 'FastAPI summary'){
        return 'summarySource.fastApiSummary';
    }
    if(value === 'Client fallback'){
        return 'summarySource.clientFallback';
    }
    return 'summarySource.clientDerived';
};

export const getBudgetStatusKey = (status) => {
    if(status === 'Over budget'){
        return 'budgetStatus.overBudget';
    }
    if(status === 'Watchlist'){
        return 'budgetStatus.watchlist';
    }
    if(status === 'Unbudgeted'){
        return 'budgetStatus.unbudgeted';
    }
    return 'budgetStatus.onTrack';
};

export const getCriticalityKey = (value) => {
    const normalized = String(value || 'medium').toLowerCase();
    if(normalized === 'high'){
        return 'criticality.high';
    }
    if(normalized === 'low'){
        return 'criticality.low';
    }
    return 'criticality.medium';
};

export const getRoleKey = (role) => {
    const normalized = String(role || 'admin').toLowerCase();
    if(normalized === 'analyst' || normalized === 'viewer' || normalized === 'admin'){
        return `roles.${normalized}`;
    }
    return 'roles.admin';
};
