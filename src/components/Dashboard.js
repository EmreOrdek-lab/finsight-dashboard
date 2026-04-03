import React, { useState, useEffect, useMemo } from 'react';
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
import IconButton from '@mui/material/IconButton';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import LoadingScreen from './LoadingScreen';
 
function Dashboard() {
    const [ theme, setTheme ] = useState('dark');
    const [ showNav, setShowNav ] = useState(false);
    const [ user, loading ] = useAuthState(auth);
    const [ userData, setUserData ] = useState({});
    const [ accounts, setAccounts ] = useState([]);
    const [ transactions, setTransactions ] = useState([]);

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

            setUserData(data.userData || {});
            setAccounts(formattedAccounts);
            setTransactions(data.transactions ? Object.values(data.transactions) : []);
        });
    }, [user]);

    const changeTheme = () => {
        setTheme(theme === "dark" ? "light" : "dark");
    };

    const setDate = () => {
        const today = new Date();
        const day = today.getDate();
        const year = today.getFullYear();
        const month = new Intl.DateTimeFormat('en-US', { month: 'long' }).format(today);
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

    const formatMoney = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(amount || 0));
    };

    const kpiCards = useMemo(() => {
        const today = new Date();
        const currentDay = today.getDate();
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
        const expenseTransactions = transactions.filter((transaction) => (
            transaction &&
            transaction.category !== 'Money In' &&
            transaction.category !== 'Transfer' &&
            transaction.category !== 'Credit Card Payment'
        ));
        const incomeTransactions = transactions.filter((transaction) => transaction && transaction.category === 'Money In');

        const netLiquidity = accounts.reduce((sum, account) => sum + Number(account.total || 0), 0);
        const totalExpenses = expenseTransactions.reduce((sum, transaction) => sum + Number(transaction.value || 0), 0);
        const totalIncome = incomeTransactions.reduce((sum, transaction) => sum + Number(transaction.value || 0), 0);
        const savingsEfficiency = totalIncome === 0 ? 0 : ((totalIncome - totalExpenses) / totalIncome) * 100;
        const burnRate = currentDay === 0 ? 0 : (totalExpenses / currentDay) * daysInMonth;
        const forecastedBalance = netLiquidity + (((totalIncome - totalExpenses) / Math.max(currentDay, 1)) * Math.max(daysInMonth - currentDay, 0));

        const dailyRows = Array.from({ length: Math.max(currentDay, 1) }, (_, index) => ({
            day: index + 1,
            income: 0,
            expense: 0,
        }));

        transactions.forEach((transaction) => {
            const transactionDay = Number(transaction?.date);
            if(!transactionDay || transactionDay < 1 || transactionDay > dailyRows.length){
                return;
            }

            if(transaction.category === 'Money In'){
                dailyRows[transactionDay - 1].income += Number(transaction.value || 0);
            } else if(transaction.category !== 'Transfer' && transaction.category !== 'Credit Card Payment'){
                dailyRows[transactionDay - 1].expense += Number(transaction.value || 0);
            }
        });

        let runningIncome = 0;
        let runningExpense = 0;
        const openingLiquidity = netLiquidity - (totalIncome - totalExpenses);
        let runningLiquidity = openingLiquidity;

        const liquidityTrend = [];
        const burnTrend = [];
        const savingsTrend = [];
        const forecastTrend = [];

        dailyRows.forEach((row, index) => {
            runningIncome += row.income;
            runningExpense += row.expense;
            runningLiquidity += row.income - row.expense;

            const elapsedDays = index + 1;
            const projectedBurn = (runningExpense / elapsedDays) * daysInMonth;
            const runningEfficiency = runningIncome === 0 ? 0 : ((runningIncome - runningExpense) / runningIncome) * 100;
            const projectedForecast = netLiquidity + (((runningIncome - runningExpense) / elapsedDays) * Math.max(daysInMonth - elapsedDays, 0));

            liquidityTrend.push({ day: row.day, value: Number(runningLiquidity.toFixed(2)) });
            burnTrend.push({ day: row.day, value: Number(projectedBurn.toFixed(2)) });
            savingsTrend.push({ day: row.day, value: Number(runningEfficiency.toFixed(2)) });
            forecastTrend.push({ day: row.day, value: Number(projectedForecast.toFixed(2)) });
        });

        return [
            {
                label: 'Net Liquidity',
                value: formatMoney(netLiquidity),
                badge: `${accounts.length} accounts`,
                detail: 'Consolidated liquidity across active accounts and liabilities.',
                tone: netLiquidity >= 0 ? 'positive' : 'negative',
                sparkline: liquidityTrend.length ? liquidityTrend : [{ day: 1, value: 0 }],
            },
            {
                label: 'Burn Rate',
                value: formatMoney(burnRate),
                badge: 'Monthly pace',
                detail: 'Projected monthly expense velocity based on current cycle spend.',
                tone: totalIncome >= burnRate ? 'neutral' : 'negative',
                sparkline: burnTrend.length ? burnTrend : [{ day: 1, value: 0 }],
            },
            {
                label: 'Savings Efficiency',
                value: `${savingsEfficiency.toFixed(1)}%`,
                badge: 'Income conversion',
                detail: 'Share of income retained after core operational expenses.',
                tone: savingsEfficiency >= 20 ? 'positive' : 'negative',
                sparkline: savingsTrend.length ? savingsTrend : [{ day: 1, value: 0 }],
            },
            {
                label: 'Forecasted Balance',
                value: formatMoney(forecastedBalance),
                badge: 'Month-end view',
                detail: 'Forward-looking balance estimate at the current daily cashflow pace.',
                tone: forecastedBalance >= 0 ? 'positive' : 'negative',
                sparkline: forecastTrend.length ? forecastTrend : [{ day: 1, value: 0 }],
            }
        ];
    }, [accounts, transactions]);

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
                            toSetShowNavOff={toSetShowNavOff}/>
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
                                            aria-label="Expand Navigation" 
                                            tabIndex={showNav ? -1 : 0}
                                            className="md:!hidden">
                                            <MenuIcon/>
                                        </IconButton>
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-zinc-500">
                                                FinSight
                                            </span>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h1 className="text-lg font-semibold md:text-2xl">Financial Analytics & GRC</h1>
                                                <span className="enterprise-header-chip">Governance-ready</span>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-zinc-400">
                                                <span data-testid="dashboardUserName" className="font-medium text-slate-900 dark:text-slate-100">
                                                    FinSight Strategic Analytics
                                                </span>
                                                <span className="hidden h-1 w-1 rounded-full bg-slate-300 dark:bg-zinc-700 sm:block"></span>
                                                <time data-testid="dashboardDate">{setDate()}</time>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="hidden items-center gap-2 lg:flex">
                                        <span className="enterprise-header-chip">Controls Monitoring</span>
                                        <span className="enterprise-header-chip">Risk Oversight</span>
                                        <span className="enterprise-header-chip">Executive Dashboard</span>
                                    </div>
                                </div>
                            </header>
                            <main className="mx-auto grid w-full max-w-[1400px] grid-cols-1 gap-6 p-6 sm:gap-6 xl:grid-cols-12 xl:auto-rows-auto xl:gap-6">
                                <ExecutiveKpiCards cards={kpiCards}/>
                                <AccountsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}/>
                                <GoalsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}/>
                                <SpendingModal 
                                    showNav={showNav} 
                                    theme={theme}/>
                                <TransactionsModal 
                                    showNav={showNav} 
                                    theme={theme} 
                                    buttonStyles={buttonStyles} 
                                    inputStyles={inputStyles}/>
                                <AnalyticsModal theme={theme}/>
                            </main>  
                        </div>
                    </div>
                }
            </div>
        </ThemeProvider>
    )
}

export default Dashboard;