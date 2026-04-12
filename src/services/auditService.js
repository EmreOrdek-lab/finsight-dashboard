import { getDatabase, push, ref, set } from 'firebase/database';

export const appendAuditEntry = async (userId, entry) => {
    if(!userId){
        return null;
    }

    const db = getDatabase();
    const auditRef = push(ref(db, `${userId}/auditLogs`));
    const payload = {
        action: entry.action || 'updated',
        domain: entry.domain || 'workspace',
        entityType: entry.entityType || 'workspace',
        summary: entry.summary || 'Workspace activity captured.',
        actorRole: entry.actorRole || 'admin',
        severity: entry.severity || 'info',
        metadata: entry.metadata || null,
        createdAt: entry.createdAt || new Date().toISOString(),
    };

    await set(auditRef, payload);
    return payload;
};
