import React from 'react';
import { auth } from '../../config/Firebase';
import { ArrowLeftRight, BarChart3, LayoutDashboard, LogOut, MoonStar, PieChart, ShieldCheck, Sun, Target, Wallet, X } from 'lucide-react';
import { ClipboardList, Scale, ShieldAlert } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import LanguageToggle from '../LanguageToggle';
import { getRoleKey } from '../../i18n/helpers';

function Nav(props) {
    const { t } = useLanguage();
    const navItems = [
        { id: 'overview', label: t('nav.overview'), icon: LayoutDashboard },
        { id: 'accounts', label: t('nav.accounts'), icon: Wallet },
        { id: 'goals', label: t('nav.goals'), icon: Target },
        { id: 'transactions', label: t('nav.transactions'), icon: ArrowLeftRight },
        { id: 'spending', label: t('nav.spending'), icon: PieChart },
        { id: 'budgets', label: t('nav.budgets'), icon: Scale },
        { id: 'governance', label: t('nav.roles'), icon: ShieldAlert },
        { id: 'analytics', label: t('nav.analytics'), icon: BarChart3 },
        { id: 'audit', label: t('nav.audit'), icon: ClipboardList },
    ];

    const goToSection = (id) => {
        const section = document.getElementById(id);
        if(section){
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        props.toSetShowNavOff();
    };

    return (
        <>
            <div className={`${props.showNav ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'} fixed inset-0 z-40 bg-zinc-950/55 backdrop-blur-sm transition md:hidden`}>
                <button
                    type="button"
                    aria-label={t('nav.closeNavigationOverlay')}
                    className="h-full w-full"
                    onClick={() => props.toSetShowNavOff()}
                />
            </div>
            <nav
                id="navsidebar"
                role='region'
                aria-labelledby="navcontrol"
                className={`${props.showNav ? 'translate-x-0' : '-translate-x-full'} enterprise-sidebar fixed left-0 top-0 z-50 flex h-full w-[280px] flex-col justify-between border-r border-slate-200 bg-white px-4 py-4 transition-transform duration-300 dark:border-zinc-800 dark:bg-zinc-950 md:w-[88px] md:translate-x-0 md:px-3`}>
                <div className="flex flex-col gap-5">
                    <div className="flex items-center justify-between md:flex-col md:gap-3">
                        <div className="flex items-center gap-3 md:flex-col">
                            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-slate-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-slate-100">
                                <ShieldCheck size={18}/>
                            </div>
                            <div className="md:hidden">
                                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-500">FinSight</div>
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{t('nav.analyticsAndGrc')}</div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => props.toSetShowNavOff()}
                            data-testid="navClose"
                            aria-label={t('nav.closeSidebar')}
                            className="flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-slate-100 md:hidden">
                            <X size={18}/>
                        </button>
                    </div>
                    <figure className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 dark:border-zinc-800 dark:bg-zinc-900/80 md:flex-col md:px-2">
                        <div className='flex h-11 w-11 items-center justify-center rounded-md bg-slate-900 text-sm font-semibold text-white dark:bg-slate-100 dark:text-zinc-950'>
                            FS
                        </div>
                        <figcaption className="min-w-0 md:hidden">
                            <div data-testid="navUserName" className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{props.userData.name}</div>
                            <div className="text-xs text-slate-500 dark:text-zinc-500">{t('nav.workspace')}</div>
                            <div className="pt-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-zinc-500">
                                {`${t(getRoleKey(props.activeRole))} ${t('dashboard.roleSuffix')}`}
                            </div>
                        </figcaption>
                    </figure>
                    <div className="flex flex-col gap-2">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    title={item.label}
                                    aria-label={item.label}
                                    onClick={() => goToSection(item.id)}
                                    className="enterprise-nav-button">
                                    <Icon size={18} className="shrink-0"/>
                                    <span className="text-sm md:hidden">{item.label}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                <footer className="flex flex-col gap-2">
                    <LanguageToggle
                        hideLabel
                        buttonStyles={props.buttonStyles}
                        className="justify-between md:flex-col md:items-center md:gap-2"
                    />
                    <button
                        type="button"
                        onClick={() => props.changeTheme()}
                        data-testid="navLightMode"
                        className="enterprise-nav-button">
                        {props.theme === 'light' ? <MoonStar size={18}/> : <Sun size={18}/>}
                        <span className="text-sm md:hidden">{props.theme === 'light' ? t('nav.darkMode') : t('nav.lightEnterprise')}</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            auth.signOut();
                            props.toSetShowNavOff();
                        }}
                        data-testid="cypress-signout"
                        className="enterprise-nav-button text-rose-600 dark:text-rose-400">
                        <LogOut size={18}/>
                        <span className="text-sm md:hidden">{t('nav.signOut')}</span>
                    </button>
                </footer>
            </nav>
        </>
       
    );
}

export default Nav;
