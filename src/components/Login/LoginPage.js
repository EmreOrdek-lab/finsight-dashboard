import React, { useState } from 'react';
import Button from '@mui/material/Button';
import Login from './Login';
import Register from './Register';
import LanguageToggle from '../LanguageToggle';
import { useLanguage } from '../../context/LanguageContext';

function LoginPage(props) {
    const { t } = useLanguage();
    const [register, setRegister] = useState(false);

    const inputLoginStyles = {
        width: 300,
        maxWidth: '100%',
        '& .MuiInputLabel-root': {
            color: props.theme === 'dark' ? '#a1a1aa' : '#475569'
        },
        '& .MuiInputBase-root': {
            color: props.theme === 'dark' ? '#fafafa' : '#0f172a',
        },
    };

    return (
        <main className='enterprise-auth-shell flex min-h-screen flex-col justify-center gap-8 px-5 py-8 md:grid md:grid-cols-[1.15fr_0.85fr] md:px-8 lg:px-16'>
            <section className="mx-auto flex w-full max-w-2xl flex-col justify-center gap-6">
                <div className="flex justify-end">
                    <LanguageToggle buttonStyles={props.buttonStyles}/>
                </div>
                <div className="flex w-fit items-center gap-3 rounded-full border border-slate-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-500 dark:border-zinc-800 dark:bg-zinc-900/80 dark:text-zinc-400">
                    <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                    {t('loginPage.platform')}
                </div>
                <div className="flex flex-col gap-4">
                    <h1 className="max-w-xl text-4xl font-semibold tracking-tight text-slate-950 dark:text-slate-50 md:text-5xl">
                        {t('loginPage.title')}
                    </h1>
                    <p className="max-w-xl text-base leading-7 text-slate-600 dark:text-zinc-400">
                        {t('loginPage.description')}
                    </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="enterprise-panel p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">{t('loginPage.visibility')}</div>
                        <div className="pt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{t('loginPage.visibilityDetail')}</div>
                    </div>
                    <div className="enterprise-panel p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">{t('loginPage.controls')}</div>
                        <div className="pt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{t('loginPage.controlsDetail')}</div>
                    </div>
                    <div className="enterprise-panel p-4">
                        <div className="text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">{t('loginPage.insights')}</div>
                        <div className="pt-2 text-sm font-medium text-slate-900 dark:text-slate-100">{t('loginPage.insightsDetail')}</div>
                    </div>
                </div>
            </section>
            <section className="mx-auto flex w-full max-w-md justify-center">
                <div className="enterprise-auth-card w-full p-6 sm:p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-slate-200 pb-4 dark:border-zinc-800">
                        <div>
                            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-zinc-500">
                                {t('loginPage.secureAccess')}
                            </div>
                            <h2 className="pt-2 text-2xl font-semibold text-slate-950 dark:text-slate-50">
                                {register ? t('loginPage.createWorkspaceAccess') : t('loginPage.signInToFinSight')}
                            </h2>
                        </div>
                    </div>
                    {register ?
                        <div className="flex flex-col gap-5 justify-center items-center">
                            <Register buttonStyles={props.buttonStyles} inputStyles={inputLoginStyles}/>
                            <div className="flex flex-row gap-3 items-center justify-center">
                                <h3 className="text-center text-sm text-slate-600 dark:text-zinc-400">{t('loginPage.alreadyHaveAccount')}</h3>
                                <Button onClick={() => setRegister(false)}
                                    size="small"
                                    data-testid="cypress-tologin"
                                    sx={props.buttonStyles}>{t('login.login')}</Button>
                            </div>
                        </div>
                        :
                        <div className="flex flex-col gap-5">
                            <Login buttonStyles={props.buttonStyles} inputStyles={inputLoginStyles}/>
                            <div className="flex flex-row gap-3 items-center justify-center">
                                <h3 className="text-center text-sm text-slate-600 dark:text-zinc-400">{t('loginPage.needNewAccount')}</h3>
                                <Button sx={props.buttonStyles}
                                    size="small"
                                    data-testid="cypress-toregister"
                                    onClick={() => setRegister(true)}>{t('register.register')}</Button>
                            </div>
                        </div>
                    }
                </div>
            </section>
        </main>
    );
};

export default LoginPage;
