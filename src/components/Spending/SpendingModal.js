import React, { useState, useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import SpendingGraph from './SpendingGraph';
import SpendingAccordion from './SpendingAccordion';
import { useLanguage } from '../../context/LanguageContext';
import { formatMoney } from '../../utils/formatters';

function SpendingModal(props) {
    const { t, locale } = useLanguage();
    const [ user ] = useAuthState(auth);
    const [ allTransactions, setAllTransactions ] = useState([]);
    const [ formattedTransactions, setFormattedTransactions ] = useState([]);
    const [ currentCategory, setCurrentCategory ] = useState(null);

    useEffect(()=> {
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/transactions');
        onValue(dbRef, (snapshot) => {
            // gets all 'spending' transactions
            if(snapshot.val()){
              let filteredArray = Object.values(snapshot.val()).filter((transaction) => {
                if(transaction.category === 'Credit Card Payment' || transaction.category === 'Money In' || transaction.category === 'Transfer'){
                    return null;
                }
                return transaction;
            })
            setAllTransactions(filteredArray);
            formatTransactions(filteredArray);
            } 
            else if(!snapshot.val()){
                // handling for no transactions, default
                setAllTransactions([]);
            }
        });
    }, []); // eslint-disable-line

    const formatTransactions = (filteredArray) => {
        filteredArray.forEach((transaction) => {
            transaction.value = parseFloat(transaction.value);
        })
    
        // unique gets transaction categories for the spending accordion
        const unique = [...new Set(filteredArray.map(item => item.category))];
        const values = new Array(unique.length).fill(0);
    
        // gets the totals for each category
        filteredArray.forEach((transaction) => {
            unique.forEach((category, index) => {
                if(transaction.category === category){
                    values[index] += transaction.value;
                }
            })
        });

        // formats the data into an obj name & value for graph to display
        let formattedData = [];
        for(let i = 0; i < unique.length; i++){
            let obj = {name: unique[i] , value:values[i] };
            formattedData.push(obj);
            
        }
        setFormattedTransactions(formattedData);
    };

    // sets selected category for accordion to expand & graph to select
    const toSetCurrentCategory = (categoryIndex) => {
        setCurrentCategory(categoryIndex);
    };

    const categories = formattedTransactions.map((category) => {
        return category.name;
    });

    // gets transactions total for accordion & formats it correctly
    const transactionsTotal = () => {
        let total = 0;
        allTransactions.forEach((transaction) => {
            total += transaction.value;
        })
        return formatMoney(Math.abs(total), 'USD', locale);
    }

    return (
        <section id="spending" className="enterprise-panel order-4 flex h-full min-h-0 flex-col gap-4 overflow-hidden bg-slate-900/50 p-6 shadow-xl xl:col-span-5 xl:col-start-8 xl:row-span-2 xl:row-start-1 xl:w-full">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('spending.title')}</h2>
            {allTransactions.length === 0 ? 
                    <h3 className="text-center text-slate-600 dark:text-zinc-400">{t('spending.empty')}</h3> 
            :
                <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                    <div className="w-full shrink-0">
                        <h3 data-testid="spendingCategory" className="h-8 self-center pt-3 text-center text-lg text-slate-900 dark:text-slate-100">{categories[currentCategory]}</h3>
                        <SpendingGraph
                            formattedTransactions={formattedTransactions}
                            currentCategory={currentCategory}
                            toSetCurrentCategory={toSetCurrentCategory}
                        />
                    </div>
                    <div className="w-full shrink-0">
                        <div className="flex items-center justify-between gap-4 pb-2 md:w-10/12 md:m-auto lg:w-11/12">
                            <h3 className="text-xl text-slate-900 dark:text-slate-100">{t('spending.categories')}</h3>
                            <h3 data-testid="spendingTotal" className="text-right text-xl font-medium text-slate-900 dark:text-slate-100">{`${transactionsTotal()} ${t('spending.totalSuffix')}`}</h3>
                        </div>
                        <div className='w-full px-2'>
                            <SpendingAccordion
                                theme={props.theme}
                                formattedTransactions={formattedTransactions}
                                allTransactions={allTransactions}
                                currentCategory={currentCategory}
                                toSetCurrentCategory={toSetCurrentCategory}
                            />
                        </div>
                    </div>
                </div>
                }
        </section>
    );
}

export default SpendingModal;
