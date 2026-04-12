export const formatMoney = (amount, currency = 'USD', locale = 'en-US') => {
    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number(amount || 0));
};

export const formatPercent = (value, digits = 1, locale = 'en-US') => {
    const formattedValue = new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(Number(value || 0));

    return locale.startsWith('tr') ? `%${formattedValue}` : `${formattedValue}%`;
};

export const formatRoleLabel = (role) => {
    const normalizedRole = String(role || 'admin').toLowerCase();
    return normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1);
};

export const formatTimestamp = (timestamp, locale = 'en-US') => {
    if(!timestamp){
        return locale.startsWith('tr') ? 'Şimdi' : 'Just now';
    }

    const date = new Date(timestamp);
    if(Number.isNaN(date.getTime())){
        return locale.startsWith('tr') ? 'Şimdi' : 'Just now';
    }

    return new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    }).format(date);
};

export const formatRelativeTime = (timestamp, locale = 'en-US') => {
    if(!timestamp){
        return locale.startsWith('tr') ? 'Az önce' : 'Moments ago';
    }

    const deltaInSeconds = Math.round((new Date(timestamp).getTime() - Date.now()) / 1000);
    if(Number.isNaN(deltaInSeconds)){
        return locale.startsWith('tr') ? 'Az önce' : 'Moments ago';
    }

    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const ranges = [
        { amount: 60, unit: 'second' },
        { amount: 60, unit: 'minute' },
        { amount: 24, unit: 'hour' },
        { amount: 7, unit: 'day' },
        { amount: 4.34524, unit: 'week' },
        { amount: 12, unit: 'month' },
        { amount: Number.POSITIVE_INFINITY, unit: 'year' },
    ];

    let value = deltaInSeconds;
    for(const range of ranges){
        if(Math.abs(value) < range.amount){
            return rtf.format(Math.round(value), range.unit);
        }
        value /= range.amount;
    }

    return locale.startsWith('tr') ? 'Az önce' : 'Moments ago';
};
