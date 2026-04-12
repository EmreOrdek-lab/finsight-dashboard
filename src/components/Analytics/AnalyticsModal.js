import React, { useState, useEffect, useMemo } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import AnalyticsGraph from './AnalyticsGraph';
import { useLanguage } from '../../context/LanguageContext';

function AnalyticsModal(props) {
    const { t } = useLanguage();
    const [ user ] = useAuthState(auth);
    const [ transactions, setTransactions ] = useState([]);
    const [ income, setIncome ] = useState(0);
    const [ expenses, setExpenses ] = useState(0);
    const [ accountTotals, setAccountTotals ] = useState({debit: 0, savings: 0, creditCards: 0});

    useEffect(() => {
        const db = getDatabase();
        const dbRefTransactions = ref(db, user.uid);
        let accountsData;
        let transactionsData;
        let hasTransactions = false;
        onValue(dbRefTransactions, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childData = childSnapshot.val();
                if(Object.keys(childData).includes('Checking')){
                    accountsData = childData;
                }
                const firstElement = Object.values(childData)[0];

                // Finds the object that contains transactions & sets a check variable for when transactions are found
                if(firstElement.hasOwnProperty('date')){
                    transactionsData = childData;
                    hasTransactions = true;
                }
            })
            // if there are no transactions, set transactionsData to empty
            if(!hasTransactions){
                transactionsData = {};
            }
            hasTransactions = false;
            setTransactions(transactionsData);
            // looks for 'spending' transactions for expenses & income or 'money in' transactions
            if(typeof transactionsData === 'object'){
                let transactionsTotal = 0;
                let expensesTotal = 0;
                Object.values(transactionsData).forEach((transaction) => {
                    if(transaction.category === 'Money In'){
                        transactionsTotal += parseFloat(transaction.value);
                    } else if(transaction.category !== 'Money In' && transaction.category !== 'Transfer' && transaction.category !== 'Credit Card Payment') {
                        expensesTotal += parseFloat(transaction.value);
                    }
                })
                setIncome(transactionsTotal);
                setExpenses(expensesTotal.toFixed(2));
            }

            // gets totals of each account
            if(typeof accountsData === 'object'){
                let debitTotal = 0.00;
                let savingsTotal = 0.00;
                let creditCardTotal = 0.00;
                Object.values(accountsData).forEach((account) => {
                    if(account.name === 'Savings'){
                        savingsTotal = parseFloat(account.total);
                    } else if(account.name !== 'Savings' && account.debit) {
                        debitTotal += parseFloat(account.total);
                    } else if(account && !account.debit){
                        creditCardTotal += parseFloat(account.total);
                    }
                });
                setAccountTotals({savings: savingsTotal.toFixed(2) , debit: (debitTotal).toFixed(2), creditCards: creditCardTotal.toFixed(2)});
            }
        });
    }, []); // eslint-disable-line

    const formatMoney = (money, isCreditCard) => {
        if(money){
            let formattedMoney = money.toString().split('.');
            let isNegative = false;
            if(!formattedMoney[1]){
                formattedMoney[1] = '00';
            }
            if(money < 0){
                formattedMoney[0] = formattedMoney[0].slice(1);
                isNegative = true;
                if(isCreditCard){
                    isNegative = false;
                }
            }
            let newMoney = [];
                let stringArray = formattedMoney[0].split('');
                while(stringArray.length){
                    newMoney.push(stringArray[0]);
                    stringArray.shift();
                    if(stringArray.length % 3 === 0 && stringArray.length !== 0){
                        newMoney.push(',');
                    }
                }
                newMoney.join('');
            return ((isNegative ? '-' : '' ) + '$'+ newMoney.join('') + '.' + formattedMoney[1]);
        }
        return '$0.00';
    }

    const calculateOverspent = () => {
        let overspent = (100 * (income - expenses) / ( income === 0 ? 1 : income )).toFixed(2);
        if(overspent < 0){
            overspent = overspent * -1;
        }
        return overspent;
    }

    const insightMessages = useMemo(() => {
        const currentDay = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const transactionArray = transactions && typeof transactions === 'object' ? Object.values(transactions) : [];
        const spendTransactions = transactionArray.filter((transaction) => (
            transaction &&
            transaction.category !== 'Money In' &&
            transaction.category !== 'Transfer' &&
            transaction.category !== 'Credit Card Payment'
        ));

        if(spendTransactions.length === 0){
            return [
                'Harcama verisi henüz oluşmadı. FinSight içgörü katmanı aktif, ilk operasyonel sinyaller yeni işlemlerle üretilecek.',
                'Gelir ve gider hareketleri geldikçe FinSight içgörüleri risk, tasarruf ve nakit akışı seviyesinde görünür olacaktır.',
            ];
        }

        const spendByCategory = spendTransactions.reduce((acc, transaction) => {
            const key = transaction.category || 'Other';
            acc[key] = (acc[key] || 0) + Number(transaction.value || 0);
            return acc;
        }, {});
        const topCategoryEntry = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0];
        const topCategoryShare = topCategoryEntry ? (topCategoryEntry[1] / Math.max(Number(expenses), 1)) * 100 : 0;
        const projectedMonthlyExpense = (Number(expenses) / Math.max(currentDay, 1)) * daysInMonth;
        const savingsRate = income === 0 ? 0 : ((income - Number(expenses)) / income) * 100;
        const highestExpenseDay = spendTransactions.reduce((acc, transaction) => {
            const day = Number(transaction.date || 0);
            acc[day] = (acc[day] || 0) + Number(transaction.value || 0);
            return acc;
        }, {});
        const highestExpenseEntry = Object.entries(highestExpenseDay).sort((a, b) => b[1] - a[1])[0];

        return [
            topCategoryEntry
                ? `${topCategoryEntry[0]} harcamaları toplam giderin %${topCategoryShare.toFixed(1)} seviyesine ulaştı, bütçe disiplini önerilir.`
                : 'Kategori bazlı harcama yoğunluğu henüz belirgin değil, işlem hacmi arttıkça öneriler netleşecektir.',
            `Mevcut burn rate korunursa ay sonu toplam gider ${formatMoney(projectedMonthlyExpense)} bandına taşınabilir.`,
            `Tasarruf verimliliği şu an %${savingsRate.toFixed(1)}. ${savingsRate >= 20 ? 'Finansal tampon seviyesi sağlıklı görünüyor.' : 'Marj baskısı artıyor, operasyonel sıkılaştırma önerilir.'}`,
            highestExpenseEntry && Number(highestExpenseEntry[0]) > 0
                ? `Ay içindeki en yoğun harcama günü ${highestExpenseEntry[0]}. gün olarak görünüyor; onay ve kontrol akışı o gün için gözden geçirilebilir.`
                : 'Gün bazlı yoğunluk tespiti için ek işlem verisi bekleniyor.'
        ];
    }, [transactions, income, expenses]);
    void insightMessages;

    const localizedInsightMessages = useMemo(() => {
        const currentDay = new Date().getDate();
        const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
        const transactionArray = transactions && typeof transactions === 'object' ? Object.values(transactions) : [];
        const spendTransactions = transactionArray.filter((transaction) => (
            transaction &&
            transaction.category !== 'Money In' &&
            transaction.category !== 'Transfer' &&
            transaction.category !== 'Credit Card Payment'
        ));

        if(spendTransactions.length === 0){
            return [
                t('analytics.noSpendData'),
                t('analytics.insightActivation'),
            ];
        }

        const spendByCategory = spendTransactions.reduce((acc, transaction) => {
            const key = transaction.category || 'Other';
            acc[key] = (acc[key] || 0) + Number(transaction.value || 0);
            return acc;
        }, {});
        const topCategoryEntry = Object.entries(spendByCategory).sort((a, b) => b[1] - a[1])[0];
        const topCategoryShare = topCategoryEntry ? (topCategoryEntry[1] / Math.max(Number(expenses), 1)) * 100 : 0;
        const projectedMonthlyExpense = (Number(expenses) / Math.max(currentDay, 1)) * daysInMonth;
        const savingsRate = income === 0 ? 0 : ((income - Number(expenses)) / income) * 100;
        const highestExpenseDay = spendTransactions.reduce((acc, transaction) => {
            const day = Number(transaction.date || 0);
            acc[day] = (acc[day] || 0) + Number(transaction.value || 0);
            return acc;
        }, {});
        const highestExpenseEntry = Object.entries(highestExpenseDay).sort((a, b) => b[1] - a[1])[0];

        return [
            topCategoryEntry
                ? t('analytics.topCategory', { category: topCategoryEntry[0], rate: `%${topCategoryShare.toFixed(1)}` })
                : t('analytics.topCategoryPending'),
            t('analytics.projectedBurn', { amount: formatMoney(projectedMonthlyExpense) }),
            t('analytics.savingsEfficiency', {
                rate: `%${savingsRate.toFixed(1)}`,
                message: savingsRate >= 20 ? t('analytics.healthyBuffer') : t('analytics.marginPressure'),
            }),
            highestExpenseEntry && Number(highestExpenseEntry[0]) > 0
                ? t('analytics.peakDay', { day: highestExpenseEntry[0] })
                : t('analytics.peakDayPending')
        ];
    }, [transactions, income, expenses, t]);

    return (
        <section id="analytics" className="enterprise-panel order-5 flex flex-col gap-6 overflow-hidden bg-slate-900/50 p-6 shadow-xl sm:w-10/12 sm:m-auto md:w-9/12 xl:col-span-12 xl:w-full">
            <div className="flex items-center justify-between gap-3">
                <h2 className="basis-7/12 text-xl font-semibold text-slate-900 dark:text-slate-100">{t('analytics.title')}</h2>
                <h3 className="hidden text-lg font-semibold text-slate-900 dark:text-slate-100 xl:inline">{t('analytics.trends')}</h3>
            </div>
            <div className="flex flex-col gap-8 xl:grid xl:grid-cols-2 xl:items-start xl:px-2"> 
                <div className="min-w-0 flex flex-col gap-5">
                    <section className="xl:grid xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start xl:gap-6">
                        <h4 className="text-slate-900 dark:text-slate-100">{t('analytics.cashflow')}</h4>
                        <div className="min-w-0 xl:flex xl:flex-col xl:gap-4">
                            <div className="flex flex-wrap justify-center gap-3 items-center xl:justify-start xl:gap-8">
                                <div className="flex flex-col justify-center items-center">
                                    <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.income')}</h5>
                                    <div data-testid="analyticsIncome" className={`${income > 0 ? 'text-green-600' : 'text-rose-600'} xl:text-2xl`}>{formatMoney(income)}</div>
                                </div>
                                <div className="self-end text-slate-900 dark:text-slate-100 xl:text-4xl">-</div>
                                <div className="flex flex-col justify-center items-center">
                                    <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.expenses')}</h5>
                                    <div data-testid="analyticsExpenses" className={`${expenses > 0 ? 'text-rose-600' : 'text-green-600'} xl:text-2xl`}>{formatMoney(expenses)}</div>
                                </div>
                                <div className="self-end text-slate-900 dark:text-slate-100 xl:text-4xl">=</div>
                            </div>
                            <div className="m-auto h-0.5 w-4/6 bg-slate-300 dark:bg-zinc-700 sm:w-3/6 lg:w-2/6 xl:hidden"></div>
                            <div className="flex flex-wrap justify-center gap-3 items-center xl:justify-start xl:gap-8">
                                <div className="flex flex-col justify-center items-center">
                                    <h5 className="text-lg text-slate-900 dark:text-slate-100">{income - expenses > 0 ? t('analytics.positiveCashflow') : t('analytics.negativeCashflow')}</h5>
                                    <div data-testid="analyticsCashflow" className={`${ income - expenses > 0 ? 'text-green-600' : 'text-rose-600' } xl:text-2xl`}>{(formatMoney(income - expenses))}</div>
                                </div>
                                <div className="self-end text-slate-900 dark:text-slate-100 xl:text-2xl">or</div>
                                <div>
                                    <h5 className="text-lg text-slate-900 dark:text-slate-100">{income - expenses > 0 ? t('analytics.unspent') : t('analytics.overspent')}</h5>
                                    <div data-testid="analyticsSpent" className={`${ income - expenses > 0 ? 'text-green-600' : 'text-rose-600' } xl:text-2xl`}>%{calculateOverspent()}</div>
                                </div>
                            </div>
                        </div>
                    </section>
                    <div className="m-auto hidden bg-slate-200 dark:bg-zinc-800 xl:block xl:h-0.5 xl:w-full"></div>
                    <section className="xl:grid xl:grid-cols-[120px_minmax(0,1fr)] xl:items-start xl:gap-6">
                        <h4 className="text-slate-900 dark:text-slate-100">{t('analytics.netWorth')}</h4>
                        <div className="mx-auto flex flex-col items-center justify-center gap-2 text-center xl:w-full xl:max-w-md">
                            <div className='flex flex-col'>
                                <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.debitAccountsTotal')}</h5>
                                <div data-testid="analyticsDebit" className={`${accountTotals.debit > 0 ? 'text-green-600' : 'text-rose-600'} xl:text-2xl`}>{formatMoney(accountTotals.debit)}</div>
                            </div>
                            <div className="text-slate-900 dark:text-slate-100">+</div>
                            <div className="flex flex-col">
                                <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.savings')}</h5>
                                <div data-testid="analyticsSavings" className={`${accountTotals.savings > 0 ? 'text-green-600' : 'text-rose-600'} xl:text-2xl`}>{formatMoney(accountTotals.savings)}</div>
                            </div>
                            <div className="text-slate-900 dark:text-slate-100">-</div>
                            <div className="flex flex-col">
                                <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.creditCardsTotal')}</h5>
                                <div data-testid="analyticsCC" className={`${accountTotals.creditCards === 0 ? 'text-green-600' : 'text-rose-600'} xl:text-2xl`}>{formatMoney(accountTotals.creditCards, true)}</div>
                            </div>
                            <div className="mt-1 h-0.5 w-4/6 bg-slate-300 dark:bg-zinc-700"></div>
                            <div className="text-slate-900 dark:text-slate-100">=</div>
                            <div className="flex flex-col gap-1 text-center">
                                <div data-testid="analyticsTotal" className={`${parseFloat(accountTotals.debit) + parseFloat(accountTotals.savings) - ( -1 * parseFloat(accountTotals.creditCards)) > 0 ? 'text-green-600' : 'text-rose-600'} xl:text-2xl`}>{formatMoney(parseFloat(accountTotals.debit) + parseFloat(accountTotals.savings) - ( -1 * parseFloat(accountTotals.creditCards)))}</div>
                                <h5 className="text-lg text-slate-900 dark:text-slate-100">{t('analytics.total')}</h5>
                            </div>
                        </div>
                    </section>
                </div>
                <div className="flex w-full min-w-0 flex-col gap-4">
                    <figure className="enterprise-stat-card h-[300px] overflow-hidden p-4">
                        {(transactions && Object.keys(transactions).length > 0) ?
                            <AnalyticsGraph transactions={transactions} theme={props.theme}/>
                            :
                            <div className="text-slate-600 dark:text-zinc-400">{t('analytics.createTransactions')}</div> 
                        }
                    </figure>
                    <aside className="enterprise-stat-card p-4">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-zinc-500">
                                    FinSight
                                </div>
                                <h3 className="pt-1 text-base font-semibold text-slate-900 dark:text-slate-100">
                                    {t('analytics.intelligence')}
                                </h3>
                            </div>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-zinc-900 dark:text-zinc-400">
                                {t('analytics.liveHeuristics')}
                            </span>
                        </div>
                        <div className="mt-3 flex flex-col gap-3">
                            {localizedInsightMessages.map((message, index) => (
                                <div key={index} className="rounded-md border border-slate-200 bg-white/70 px-3 py-2 text-sm leading-6 text-slate-700 dark:border-zinc-800 dark:bg-zinc-950/50 dark:text-zinc-300">
                                    {message}
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>
            </div>
        </section>
    );
}

export default AnalyticsModal;
