import { getDatabase, push, ref, remove, set, update } from 'firebase/database';
import { appendAuditEntry } from './auditService';
import { formatMoney, formatRoleLabel } from '../utils/formatters';

export const DEFAULT_BUDGET_TEMPLATES = [
    { category: 'Housing', planned: 1800, owner: 'Finance Ops', criticality: 'High' },
    { category: 'Personal', planned: 850, owner: 'People Ops', criticality: 'Medium' },
    { category: 'Transportation', planned: 950, owner: 'Operations', criticality: 'Medium' },
    { category: 'Food', planned: 650, owner: 'Workplace', criticality: 'Low' },
    { category: 'Health', planned: 500, owner: 'People Ops', criticality: 'Medium' },
    { category: 'Entertainment', planned: 300, owner: 'Culture', criticality: 'Low' },
];

const buildBudgetRecord = (budget) => {
    const timestamp = new Date().toISOString();
    return {
        id: budget.id || `budget-${budget.category.toLowerCase().replace(/\s+/g, '-')}`,
        category: budget.category,
        planned: Number(budget.planned || 0),
        owner: budget.owner || 'Finance Ops',
        criticality: budget.criticality || 'Medium',
        createdAt: budget.createdAt || timestamp,
        updatedAt: timestamp,
    };
};

export const ensureWorkspaceGovernance = async ({ userId, userData = {}, budgets = [] }) => {
    if(!userId){
        return;
    }

    const db = getDatabase();
    const updates = {};
    const changes = [];
    const defaultRole = userData.role || 'admin';

    if(!userData.role){
        updates[`${userId}/userData/role`] = 'admin';
        changes.push('default role');
    }

    if(!userData.activeRole){
        updates[`${userId}/userData/activeRole`] = defaultRole;
        changes.push('active role');
    }

    if(!budgets.length){
        DEFAULT_BUDGET_TEMPLATES.forEach((budget) => {
            const budgetKey = push(ref(db, `${userId}/budgets`)).key;
            updates[`${userId}/budgets/${budgetKey}`] = buildBudgetRecord(budget);
        });
        changes.push('budget plan');
    }

    if(Object.keys(updates).length === 0){
        return;
    }

    await update(ref(db), updates);
    await appendAuditEntry(userId, {
        action: 'initialized',
        domain: 'workspace',
        entityType: 'governance',
        actorRole: defaultRole,
        summary: `Governance bootstrap completed for ${changes.join(', ')}.`,
        severity: 'info',
    });
};

export const upsertBudgetItem = async (userId, budget, actorRole = 'admin') => {
    if(!userId){
        return null;
    }

    const db = getDatabase();
    const record = buildBudgetRecord(budget);

    if(budget.firebaseKey){
        await update(ref(db, `${userId}/budgets/${budget.firebaseKey}`), record);
        await appendAuditEntry(userId, {
            action: 'updated',
            domain: 'budgets',
            entityType: 'budget',
            actorRole,
            summary: `${record.category} budget updated to ${formatMoney(record.planned)}.`,
            severity: 'info',
        });
        return { ...record, firebaseKey: budget.firebaseKey };
    }

    const budgetRef = push(ref(db, `${userId}/budgets`));
    await set(budgetRef, record);
    await appendAuditEntry(userId, {
        action: 'created',
        domain: 'budgets',
        entityType: 'budget',
        actorRole,
        summary: `${record.category} budget created at ${formatMoney(record.planned)}.`,
        severity: 'info',
    });
    return { ...record, firebaseKey: budgetRef.key };
};

export const removeBudgetItem = async (userId, budget, actorRole = 'admin') => {
    if(!userId || !budget?.firebaseKey){
        return;
    }

    const db = getDatabase();
    await remove(ref(db, `${userId}/budgets/${budget.firebaseKey}`));
    await appendAuditEntry(userId, {
        action: 'deleted',
        domain: 'budgets',
        entityType: 'budget',
        actorRole,
        summary: `${budget.category} budget removed from governance plan.`,
        severity: 'warning',
    });
};

export const setActiveWorkspaceRole = async (userId, nextRole, actorRole = 'admin') => {
    if(!userId){
        return;
    }

    const db = getDatabase();
    await update(ref(db, `${userId}/userData`), {
        activeRole: nextRole,
    });
    await appendAuditEntry(userId, {
        action: 'updated',
        domain: 'access',
        entityType: 'role',
        actorRole,
        summary: `Active workspace role switched to ${formatRoleLabel(nextRole)}.`,
        severity: 'info',
    });
};
