import React, { useState } from 'react';
import Button from '@mui/material/Button';
import { setActiveWorkspaceRole } from '../services/workspaceGovernanceService';
import { PERMISSIONS, getRoleDefinition, getRoleDefinitions, hasPermission } from '../utils/permissions';
import { useLanguage } from '../context/LanguageContext';
import { getRoleKey } from '../i18n/helpers';

function AccessControlPanel(props) {
    const { t } = useLanguage();
    const [ status, setStatus ] = useState('');
    const activeRoleDefinition = getRoleDefinition(props.activeRole);
    const canAdjustRoles = hasPermission(props.baseRole, PERMISSIONS.manageRoles);

    const switchRole = async (nextRole) => {
        if(!canAdjustRoles || nextRole === props.activeRole){
            return;
        }

        await setActiveWorkspaceRole(props.userId, nextRole, props.baseRole);
        setStatus(t('accessControl.switchedRole', { role: t(getRoleKey(nextRole)) }));
    };

    return (
        <section id="governance" className="enterprise-panel order-7 flex flex-col gap-5 p-6 xl:col-span-5">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('accessControl.eyebrow')}
                    </div>
                    <h2 className="pt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('accessControl.title')}</h2>
                </div>
                <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                    {props.summarySource}
                </span>
            </div>
            <div className="grid gap-3">
                <article className="enterprise-stat-card px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-zinc-500">{t('accessControl.effectiveRole')}</div>
                            <div className="pt-1 text-lg font-semibold text-slate-900 dark:text-slate-100">{t(getRoleKey(props.activeRole))}</div>
                        </div>
                        <div className="text-right text-sm text-slate-600 dark:text-zinc-400">
                            <div>{t('accessControl.assignedAdmin', { role: t(getRoleKey(props.baseRole)) })}</div>
                            <div>{props.activeRole !== props.baseRole ? t('accessControl.simulationActive') : t('accessControl.primaryRole')}</div>
                        </div>
                    </div>
                    <p className="pt-3 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {t(`roleDescriptions.${props.activeRole}`)}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-3">
                        {activeRoleDefinition.permissions.length > 0 ? activeRoleDefinition.permissions.map((permission) => (
                            <span key={permission} className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
                                {t(`permissions.${permission}`)}
                            </span>
                        )) : (
                            <span className="rounded-full border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:border-zinc-700 dark:text-zinc-300">
                                {t('accessControl.readOnlyAnalytics')}
                            </span>
                        )}
                    </div>
                </article>

                <div className="grid gap-3">
                    {getRoleDefinitions().map((role) => (
                        <article key={role.key} className="enterprise-stat-card px-4 py-4">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{t(getRoleKey(role.key))}</h3>
                                    <p className="pt-1 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                                        {t(`roleDescriptions.${role.key}`)}
                                    </p>
                                </div>
                                <Button
                                    sx={props.buttonStyles}
                                    disabled={!canAdjustRoles || role.key === props.activeRole}
                                    onClick={() => switchRole(role.key)}>
                                    {role.key === props.activeRole ? t('common.active') : t('accessControl.switchToRole', { role: t(getRoleKey(role.key)) })}
                                </Button>
                            </div>
                        </article>
                    ))}
                </div>
            </div>
            <div className="enterprise-stat-card px-4 py-4 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                {t('accessControl.frontendNote')}
            </div>
            {status && (
                <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                    {status}
                </div>
            )}
        </section>
    );
}

export default AccessControlPanel;
