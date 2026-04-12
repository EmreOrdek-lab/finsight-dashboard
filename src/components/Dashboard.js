import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../config/Firebase';
import LoginPage from './Login/LoginPage';
import { getDatabase, ref, onValue } from "firebase/database";
import Nav from './Nav/Nav';
import AccountsModal from "./Accounts/AccountsModal";
import SpendingModal from "./Spending/SpendingModal";
import AnalyticsModal from './Analytics/AnalyticsModal';
import TransactionsModal from './Transactions/TransactionsModal';
import GoalsModal from './Goals/GoalsModal';
import ExecutiveKpiCards from './ExecutiveKpiCards';
import BudgetPerformancePanel from './BudgetPerformancePanel';
import AccessControlPanel from './AccessControlPanel';
import AuditLogPanel from './AuditLogPanel';
import IconButton from '@mui/material/IconButton';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LoadingScreen from './LoadingScreen';
import { buildFinancialSummary } from '../utils/financialSummary';
import { analyticsApiEnabled, fetchWorkspaceSummary } from '../services/backendApi';
import { ensureWorkspaceGovernance } from '../services/workspaceGovernanceService';
import { formatPercent } from '../utils/formatters';
import { getNormalizedRole, getPermissionMap } from '../utils/permissions';
import { useLanguage } from '../context/LanguageContext';
import LanguageToggle from './LanguageToggle';
import { getRoleKey, getSummarySourceKey } from '../i18n/helpers';
 
function Dashboard() {
    const { t, locale } = useLanguage();
    const [ theme, setTheme ] = useState('dark');
    const [ showNav, setShowNav ] = useState(false);
    const [ user, loading ] = useAuthState(auth);
    const [ userData, setUserData ] = useState({});
    const [ accounts, setAccounts ] = useState([]);
    const [ transactions, setTransactions ] = useState([]);
    const [ goals, setGoals ] = useState([]);
    const [ budgets, setBudgets ] = useState([]);
    const [ auditEntries, setAuditEntries ] = useState([]);
    const [ remoteSummary, setRemoteSummary ] = useState(null);
    const [ summarySource, setSummarySource ] = useState('Client-derived');
    const governanceBootstrapRef = useRef(false);

    useEffect(() => {
        // specifies dark or light mode for tailwind
        if(theme === 'dark'){
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    useEffect(() => {
        if(!user){
            setUserData({});
            setAccounts([]);
            setTransactions([]);
            setGoals([]);
            setBudgets([]);
            setAuditEntries([]);
            setRemoteSummary(null);
            setSummarySource('Client-derived');
            governanceBootstrapRef.current = false;
            return;
        }

        const db = getDatabase();
        const dbRef = ref(db, user.uid);

        return onValue(dbRef, (snapshot) => {
            const data = snapshot.val() || {};
            const rawAccounts = data.accounts || {};
            const formattedAccounts = [];

            Object.values(rawAccounts).forEach((account) => {
                if(account && typeof account === 'object' && Object.prototype.hasOwnProperty.call(account, 'id')){
                    formattedAccounts.push(account);
                } else if(account && typeof account === 'object'){
                    formattedAccounts.push(...Object.values(account));
                }
            });

            const formattedBudgets = Object.entries(data.budgets || {}).map(([firebaseKey, budget]) => ({
                ...budget,
                firebaseKey,
            }));
            const formattedAuditEntries = Object.values(data.auditLogs || {}).sort((left, right) => (
                new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime()
            ));

            setUserData(data.userData || {});
            setAccounts(formattedAccounts);
            setTransactions(data.transactions ? Object.values(data.transactions) : []);
            setGoals(data.goals ? Object.values(data.goals) : []);
            setBudgets(formattedBudgets);
            setAuditEntries(formattedAuditEntries);
        });
    }, [user]);

    const baseRole = useMemo(() => getNormalizedRole(userData.role || 'admin'), [userData.role]);
    const activeRole = useMemo(() => getNormalizedRole(userData.activeRole || baseRole), [userData.activeRole, baseRole]);
    const permissions = useMemo(() => getPermissionMap(activeRole), [activeRole]);

    useEffect(() => {
        if(!user){
            return;
        }

        const needsBootstrap = !userData.role || !userData.activeRole || budgets.length === 0;
        if(!needsBootstrap || governanceBootstrapRef.current){
            return;
        }

        governanceBootstrapRef.current = true;
        ensureWorkspaceGovernance({
            userId: user.uid,
            userData,
            budgets,
        }).finally(() => {
            governanceBootstrapRef.current = false;
        });
    }, [user, userData, budgets]);

    const changeTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const setDate = () => {
        const today = new Date();
        if(locale.startsWith('tr')){
            return new Intl.DateTimeFormat(locale, {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
            }).format(today);
        }

        const day = today.getDate();
        const year = today.getFullYear();
        const month = new Intl.DateTimeFormat(locale, { month: 'long' }).format(today);
        const mod10 = day % 10;
        const mod100 = day % 100;
        const suffix = mod10 === 1 && mod100 !== 11
            ? 'st'
            : mod10 === 2 && mod100 !== 12
                ? 'nd'
                : mod10 === 3 && mod100 !== 13
                    ? 'rd'
                    : 'th';

        return `${month} ${day}${suffix}, ${year}`;
    };

    const localSummary = useMemo(() => {
        return buildFinancialSummary({
            accounts,
            transactions,
            goals,
            budgets,
        }, { locale, t });
    }, [accounts, transactions, goals, budgets, locale, t]);

    useEffect(() => {
        let isMounted = true;

        if(!user){
            return () => {
                isMounted = false;
            };
        }

        if(!analyticsApiEnabled){
            setRemoteSummary(null);
            setSummarySource('Client-derived');
            return () => {
                isMounted = false;
            };
        }

        fetchWorkspaceSummary({
            accounts,
            transactions,
            goals,
            budgets,
        }).then((response) => {
            if(isMounted){
                setRemoteSummary(response);
                setSummarySource('FastAPI summary');
            }
        }).catch(() => {
            if(isMounted){
                setRemoteSummary(null);
                setSummarySource('Client fallback');
            }
        });

        return () => {
            isMounted = false;
        };
    }, [user, accounts, transactions, goals, budgets]);

    const summary = locale.startsWith('tr') ? localSummary : (remoteSummary || localSummary);
    const translatedSummarySource = t(getSummarySourceKey(summarySource));
    const activeRoleLabel = t(getRoleKey(activeRole));

    const toSetShowNavOn = () => {
        setShowNav(true);
        const body = document.querySelector("body");
        body.style.overflow = "hidden";
    }

    const toSetShowNavOff = () => {
        setShowNav(false);
        const body = document.querySelector("body");
        body.style.overflow = "auto";
    }

    const buttonStyles = {
        fontSize: 13,
        fontWeight: 600,
        color: theme === 'dark' ? '#f8fafc' : '#0f172a',
        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
        border: `1px solid ${theme === 'dark' ? 'rgba(113, 113, 122, 0.3)' : 'rgba(148, 163, 184, 0.32)'}`,
        borderRadius: '8px',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
            backgroundColor: theme === 'dark' ? '#27272a' : '#f8fafc',
            borderColor: theme === 'dark' ? 'rgba(161, 161, 170, 0.34)' : 'rgba(100, 116, 139, 0.35)',
        },
        boxShadow: 'none'
    };

    const navButtonStyle = {
        color: theme === 'dark' ? '#f4f4f5' : '#18181b',
        border: `1px solid ${theme === 'dark' ? 'rgba(161, 161, 170, 0.18)' : 'rgba(15, 23, 42, 0.08)'}`,
        borderRadius: '8px',
        backgroundColor: theme === 'dark' ? 'rgba(24, 24, 27, 0.92)' : 'rgba(255, 255, 255, 0.9)',
        fontSize: 20,
        boxShadow: 'none',
        '&:hover': {
            backgroundColor: theme === 'dark' ? 'rgba(39, 39, 42, 0.96)' : '#f8fafc',
        }
    };

    const inputStyles = {
        width: {
            xs: '100%',
            md: 300,
        },
        maxWidth: 320,
        margin: 'auto',
        '& .MuiInputLabel-root': {
            color: theme === 'dark' ? '#a1a1aa' : '#475569',
        },
        '& .MuiInputBase-root': {
            color: theme === 'dark' ? '#fafafa' : '#0f172a',
            borderRadius: '8px',
        },
        '& .MuiFilledInput-root': {
            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
            border: `1px solid ${theme === 'dark' ? 'rgba(113, 113, 122, 0.28)' : 'rgba(148, 163, 184, 0.35)'}`,
            '&:hover': {
                backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
            },
            '&.Mui-focused': {
                backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
            }
        },
        '& .MuiOutlinedInput-root': {
            backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
        },
        '& .MuiInputBase-root.Mui-disabled': {
            backgroundColor: theme === 'dark' ? '#27272a' : '#f8fafc',
        },
        '& .MuiFormHelperText-root': {
            marginLeft: 0,
        },
    };

    const muiTheme = useMemo(() => createTheme({
        palette: {
            mode: theme,
            primary: {
                main: theme === 'dark' ? '#e4e4e7' : '#0f172a',
            },
            background: {
                default: theme === 'dark' ? '#09090b' : '#f1f5f9',
                paper: theme === 'dark' ? '#18181b' : '#ffffff',
            },
            text: {
                primary: theme === 'dark' ? '#fafafa' : '#0f172a',
                secondary: theme === 'dark' ? '#a1a1aa' : '#475569',
            },
            divider: theme === 'dark' ? 'rgba(113, 113, 122, 0.22)' : 'rgba(148, 163, 184, 0.28)',
        },
        shape: {
            borderRadius: 8,
        },
        typography: {
            fontFamily: '"Inter", "Roboto", "Segoe UI", sans-serif',
            button: {
                textTransform: 'none',
                fontWeight: 600,
            },
        },
        components: {
            MuiCssBaseline: {
                styleOverrides: {
                    body: {
                        backgroundColor: theme === 'dark' ? '#09090b' : '#f1f5f9',
                    },
                },
            },
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: 'none',
                        border: `1px solid ${theme === 'dark' ? 'rgba(113, 113, 122, 0.22)' : 'rgba(148, 163, 184, 0.2)'}`,
                        boxShadow: 'none',
                    },
                },
            },
            MuiButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        paddingInline: 14,
                        minHeight: 38,
                        boxShadow: 'none',
                        border: `1px solid ${theme === 'dark' ? 'rgba(113, 113, 122, 0.28)' : 'rgba(148, 163, 184, 0.32)'}`,
                        transition: 'all 0.2s ease-in-out',
                    },
                },
            },
            MuiIconButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                    },
                },
            },
            MuiFilledInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                        border: `1px solid ${theme === 'dark' ? 'rgba(113, 113, 122, 0.28)' : 'rgba(148, 163, 184, 0.32)'}`,
                        '&:before, &:after': {
                            display: 'none',
                        },
                    },
                },
            },
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        '& fieldset': {
                            borderColor: theme === 'dark' ? 'rgba(113, 113, 122, 0.28)' : 'rgba(148, 163, 184, 0.32)',
                        },
                    },
                },
            },
            MuiDialog: {
                styleOverrides: {
                    paper: {
                        borderRadius: 8,
                    },
                },
            },
            MuiAccordion: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        overflow: 'hidden',
                        '&:before': {
                            display: 'none',
                        },
                    },
                },
            },
            MuiAlert: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                    },
                },
            },
        },
    }), [theme]);

    return(
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <div className='enterprise-shell bg-slate-100 text-slate-900 transition-all dark:bg-zinc-950 dark:text-slate-100'>
                { loading && <LoadingScreen/>}
                { !user ? 
                    <LoginPage 
                        buttonStyles={buttonStyles} 
                        inputStyles={inputStyles} 
                        theme={theme}/>
                :
                    <div className="min-h-screen w-full overflow-x-hidden">
                        <Nav 
                            userData={userData} 
                            theme={theme} 
                            changeTheme={changeTheme} 
                            showNav={showNav} 
                            buttonStyles={buttonStyles} 
                            toSetShowNavOff={toSetShowNavOff}
                            activeRole={activeRole}/>
                        <div className="min-h-screen md:pl-[88px]">
                            <header id="overview" className="sticky top-0 z-30 border-b border-slate-200/80 bg-slate-100/90 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/90">
                                <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-5 py-5 md:px-6 lg:px-8 2xl:max-w-[1400px]">
                                    <div className="flex items-center gap-3">
                                        <IconButton 
                                            data-testid="cypress-navcontrol"
                                            onClick={() => toSetShowNavOn()} 
                                            sx={navButtonStyle} 
                                            aria-expanded={showNav ? 'true' : 'false'} 
                                            aria-controls="navsidebar" 
                                            id='navcontrol' 
                                            aria-label={t('nav.expandNavigation')} 
                                            tabIndex={showNav ? -1 : 0}
                                            className="md:!hidden">
                                            <MenuIcon/>
                                        </IconButton>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-zinc-500">
                                                FinSight
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h1 className="text-lg font-semibold md:text-2xl">{t('dashboard.title')}</h1>
                                                <span className="enterprise-header-chip">{t('dashboard.governanceReady')}</span>
                                                <span className="enterprise-header-chip">{`${activeRoleLabel} ${t('dashboard.roleSuffix')}`}</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                                                <span data-testid="dashboardUserName" className="font-medium text-slate-900 dark:text-slate-100">
                                                    {t('dashboard.workspaceTitle')}
                                                </span>
                                                <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-700 sm:block"></span>
                                                <time data-testid="dashboardDate">{setDate()}</time>
                                                <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-700 sm:block"></span>
                                                <span>{translatedSummarySource}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden items-center gap-2 lg:flex">
                                        <LanguageToggle
                                            hideLabel
                                            buttonStyles={buttonStyles}
                                            className="mr-1"
                                        />
                                        <span className="enterprise-header-chip">{t('dashboard.controlsMonitoring')}</span>
                                        <span className="enterprise-header-chip">
                                            {summary.governance.plannedBudget > 0
                                                ? t('dashboard.budgetUse', { rate: formatPercent(summary.governance.budgetAdherenceRate, 1, locale) })
                                                : t('dashboard.budgetPending')}
                                        </span>
                                        <span className="enterprise-header-chip">{t('dashboard.overspendAlerts', { count: summary.governance.overBudgetCount })}</span>
                                    </div>
                                </div>
                            </header>
                            <main className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 p-6 sm:gap-6 xl:grid-cols-12 xl:auto-rows-auto xl:gap-6">
                                <ExecutiveKpiCards cards={summary.cards}/>
                                <AccountsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}
                                    permissions={permissions}
                                    baseRole={baseRole}/>
                                <GoalsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}
                                    permissions={permissions}
                                    baseRole={baseRole}/>
                                <SpendingModal 
                                    showNav={showNav} 
                                    theme={theme}/>
                                <TransactionsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}
                                    permissions={permissions}
                                    baseRole={baseRole}/>
                                <BudgetPerformancePanel
                                    theme={theme}
                                    buttonStyles={buttonStyles}
                                    inputStyles={inputStyles}
                                    userId={user.uid}
                                    baseRole={baseRole}
                                    permissions={permissions}
                                    budgets={budgets}
                                    summary={summary}
                                    summarySource={translatedSummarySource}/>
                                <AccessControlPanel
                                    userId={user.uid}
                                    baseRole={baseRole}
                                    activeRole={activeRole}
                                    buttonStyles={buttonStyles}
                                    summarySource={translatedSummarySource}/>
                                <AnalyticsModal theme={theme}/>
                                <AuditLogPanel
                                    auditEntries={auditEntries}
                                    permissions={permissions}
                                    buttonStyles={buttonStyles}/>
                            </main>  
                        </div>
                    </div>
                }
            </div>
        </ThemeProvider>
    )
}

export default Dashboard;
