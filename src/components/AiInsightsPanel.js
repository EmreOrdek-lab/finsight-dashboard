import React, { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { analyticsApiEnabled, requestAiWorkspaceAnalysis } from '../services/backendApi';
import { useLanguage } from '../context/LanguageContext';

function AiInsightsPanel(props) {
    const { t, locale } = useLanguage();
    const [ question, setQuestion ] = useState('');
    const [ answer, setAnswer ] = useState('');
    const [ error, setError ] = useState('');
    const [ isLoading, setIsLoading ] = useState(false);

    const suggestedPrompts = useMemo(() => ([
        t('aiPanel.promptRunway'),
        t('aiPanel.promptBurn'),
        t('aiPanel.promptBudget'),
        t('aiPanel.promptSummary'),
    ]), [t]);

    const runAnalysis = async (nextQuestion = question) => {
        const trimmedQuestion = nextQuestion.trim();

        if(!trimmedQuestion){
            setError(t('aiPanel.missingQuestion'));
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await requestAiWorkspaceAnalysis({
                question: trimmedQuestion,
                locale,
                accounts: props.accounts,
                transactions: props.transactions,
                goals: props.goals,
                budgets: props.budgets,
            });
            setAnswer(response.answer);
            setQuestion(trimmedQuestion);
        } catch (requestError) {
            setError(requestError.message || t('aiPanel.genericError'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <section id="ai-insights" className="enterprise-panel order-8 flex flex-col gap-5 p-6 xl:col-span-12">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('aiPanel.eyebrow')}
                    </div>
                    <h2 className="pt-2 text-2xl font-semibold text-slate-900 dark:text-slate-100">{t('aiPanel.title')}</h2>
                    <p className="pt-2 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {t('aiPanel.description')}
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                        {t('aiPanel.poweredBy')}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                        {props.summarySource}
                    </span>
                </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
                <aside className="enterprise-stat-card p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                        {t('aiPanel.suggestions')}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                        {suggestedPrompts.map((prompt) => (
                            <Button
                                key={prompt}
                                sx={props.buttonStyles}
                                disabled={!analyticsApiEnabled || isLoading}
                                onClick={() => {
                                    setQuestion(prompt);
                                    void runAnalysis(prompt);
                                }}>
                                {prompt}
                            </Button>
                        ))}
                    </div>
                    <p className="pt-4 text-sm leading-6 text-slate-600 dark:text-zinc-400">
                        {analyticsApiEnabled ? t('aiPanel.groundingNote') : t('aiPanel.backendRequired')}
                    </p>
                </aside>

                <div className="flex flex-col gap-3">
                    <TextField
                        value={question}
                        onChange={(event) => {
                            setQuestion(event.target.value);
                            if(error){
                                setError('');
                            }
                        }}
                        disabled={!analyticsApiEnabled || isLoading}
                        label={t('aiPanel.inputLabel')}
                        placeholder={t('aiPanel.placeholder')}
                        multiline
                        minRows={4}
                        fullWidth
                        sx={{
                            ...props.inputStyles,
                            maxWidth: 'none',
                            margin: 0,
                            '& .MuiInputBase-root': {
                                ...(props.inputStyles['& .MuiInputBase-root'] || {}),
                                alignItems: 'flex-start',
                            },
                        }}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                        <Button
                            sx={props.buttonStyles}
                            disabled={!analyticsApiEnabled || isLoading || !question.trim()}
                            onClick={() => void runAnalysis()}>
                            {isLoading ? t('aiPanel.asking') : t('aiPanel.ask')}
                        </Button>
                    </div>
                    {error && (
                        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                            {error}
                        </div>
                    )}
                    <article className="enterprise-stat-card min-h-[220px] p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                                    {t('aiPanel.responseBadge')}
                                </div>
                                <h3 className="pt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {t('aiPanel.responseTitle')}
                                </h3>
                            </div>
                        </div>
                        <div className="pt-4 text-sm leading-7 text-slate-700 dark:text-zinc-300 whitespace-pre-wrap">
                            {answer || t('aiPanel.empty')}
                        </div>
                    </article>
                </div>
            </div>
        </section>
    );
}

export default AiInsightsPanel;
