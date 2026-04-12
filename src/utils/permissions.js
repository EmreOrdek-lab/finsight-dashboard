export const PERMISSIONS = {
    manageAccounts: 'manageAccounts',
    manageGoals: 'manageGoals',
    manageTransactions: 'manageTransactions',
    manageBudgets: 'manageBudgets',
    manageRoles: 'manageRoles',
    viewAuditLogs: 'viewAuditLogs',
};

const ROLE_DEFINITIONS = {
    admin: {
        label: 'Admin',
        description: 'Full control of accounts, budgets, roles, transactions, and governance history.',
        permissions: Object.values(PERMISSIONS),
    },
    analyst: {
        label: 'Analyst',
        description: 'Can operate budgets, transactions, and goals while staying out of role and account administration.',
        permissions: [
            PERMISSIONS.manageGoals,
            PERMISSIONS.manageTransactions,
            PERMISSIONS.manageBudgets,
            PERMISSIONS.viewAuditLogs,
        ],
    },
    viewer: {
        label: 'Viewer',
        description: 'Read-only access to dashboards and operational visibility without edit privileges.',
        permissions: [],
    },
};

export const getNormalizedRole = (role) => {
    const normalizedRole = String(role || 'admin').toLowerCase();
    return ROLE_DEFINITIONS[normalizedRole] ? normalizedRole : 'admin';
};

export const getRoleDefinition = (role) => {
    return ROLE_DEFINITIONS[getNormalizedRole(role)];
};

export const getRoleDefinitions = () => {
    return Object.entries(ROLE_DEFINITIONS).map(([key, value]) => ({
        key,
        ...value,
    }));
};

export const hasPermission = (role, permission) => {
    return getRoleDefinition(role).permissions.includes(permission);
};

export const getPermissionMap = (role) => {
    return {
        manageAccounts: hasPermission(role, PERMISSIONS.manageAccounts),
        manageGoals: hasPermission(role, PERMISSIONS.manageGoals),
        manageTransactions: hasPermission(role, PERMISSIONS.manageTransactions),
        manageBudgets: hasPermission(role, PERMISSIONS.manageBudgets),
        manageRoles: hasPermission(role, PERMISSIONS.manageRoles),
        viewAuditLogs: hasPermission(role, PERMISSIONS.viewAuditLogs),
    };
};
