const API_ROOT = process.env.REACT_APP_ANALYTICS_API_URL?.replace(/\/$/, '');

export const analyticsApiEnabled = Boolean(API_ROOT);

const postJson = async (path, payload) => {
    if(!analyticsApiEnabled){
        throw new Error('Analytics API is not configured.');
    }

    const response = await fetch(`${API_ROOT}${path}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if(!response.ok){
        let detail = `Analytics API returned ${response.status}`;

        try {
            const errorPayload = await response.json();
            if(errorPayload?.detail){
                detail = errorPayload.detail;
            }
        } catch (error) {
            void error;
        }

        throw new Error(detail);
    }

    return response.json();
};

export const fetchWorkspaceSummary = async (payload) => {
    if(!analyticsApiEnabled){
        return null;
    }

    return postJson('/api/v1/summary', payload);
};

export const requestAiWorkspaceAnalysis = async (payload) => postJson('/api/v1/ai-analysis', payload);
