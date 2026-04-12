const API_ROOT = process.env.REACT_APP_ANALYTICS_API_URL?.replace(/\/$/, '');

export const analyticsApiEnabled = Boolean(API_ROOT);

export const fetchWorkspaceSummary = async (payload) => {
    if(!analyticsApiEnabled){
        return null;
    }

    const response = await fetch(`${API_ROOT}/api/v1/summary`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if(!response.ok){
        throw new Error(`Analytics API returned ${response.status}`);
    }

    return response.json();
};
