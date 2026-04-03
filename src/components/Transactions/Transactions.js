import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

function Transactions(props) {
    const [ user ] = useAuthState(auth);
    const [ count, setCount ] = useState(0);
    const actionButtonSx = {
        minWidth: 36,
        width: 36,
        height: 36,
        color: 'text.secondary',
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        '&:hover': {
            borderColor: 'divider',
            backgroundColor: 'action.hover',
        },
    };

    useEffect(()=> {
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/transactions');
        onValue(dbRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childData = childSnapshot.val();
                // if snapshot id is found in the alltransactions array dont add it
                let check = props.allTransactions.some(item => item.id === childData.id);
                if(!check){
                    let oldTransactions = props.allTransactions;
                    oldTransactions.push(childData);
                    props.toSetAllTransactions(oldTransactions);
                }
                setCount(count + 1);
            })});
    }, []); // eslint-disable-line

    const deleteTransaction = (transacitonToDelete, index) => {
        props.deleteTransaction(transacitonToDelete, index);
    }

    const editTransaction = (transaction, index) => {
        props.editTransaction(transaction);
        props.deleteTransaction(transaction, index, true);
    }

    // sort transactions in decending order by date 
    const sortTransactions = transactions => {
        if(transactions.length !== 1){
            let tempArray = transactions;
            tempArray.sort((a, b) => b.date - a.date);
            return tempArray;
        }
        return transactions;
    };

    const formatDate = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = months[new Date().getMonth()];
        return `${currentMonth} ${date}`;
    };

    const formatMoney = (money, transaction) => {
        const sign = transaction.category === 'Transfer' ? '' : (transaction.positive ? '+' : '-');
        return `${sign}${new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(Number(money || 0))}`;
    };

    const getTransactionTone = (transaction) => {
        if(transaction.category === 'Transfer'){
            return 'text-slate-600 dark:text-zinc-300';
        }
        return transaction.positive ? 'text-emerald-600' : 'text-red-600';
    };

    const renderTransaction = (item, index) => {
        return (
            <li key={item.id} data-testid={`transaction-${index}`} className="enterprise-stat-card px-3.5 py-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                        <div className="flex flex-col gap-1 md:grid md:grid-cols-[minmax(0,1.4fr)_auto_minmax(0,1fr)] md:items-start md:gap-3">
                            <div className="min-w-0">
                                <h3 className={`truncate text-xs font-semibold uppercase tracking-[0.14em] ${getTransactionTone(item)}`}>{item.name}</h3>
                                <div className="truncate pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                                    {item.transferTo ? `Transfer to ${item.transferTo}` : item.category}
                                </div>
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 dark:text-zinc-500 md:text-center">
                                {formatDate(item.date)}
                            </div>
                            <div className="min-w-0 text-left md:text-right">
                                <div className={`text-sm font-semibold tabular-nums md:text-[15px] ${getTransactionTone(item)}`}>
                                    {formatMoney(item.value, item)}
                                </div>
                                <div className="truncate pt-1 text-[11px] text-slate-600 dark:text-zinc-400">
                                    {item.transferTo ? `From ${item.account}` : item.account}
                                </div>
                            </div>
                        </div>
                    </div>
                    { props.modalOn &&
                        <div className="flex justify-end gap-1 self-start justify-self-end md:flex-col">
                            <Button size="small" 
                                variant="outlined"
                                onClick={() => editTransaction(item, index)} 
                                disabled={props.editOn ? true : false}
                                data-testid={`transactionEdit-${index}`}
                                aria-label='Edit transaction'
                                sx={actionButtonSx}>
                                    <EditIcon/>
                            </Button>
                            <Button size="small" 
                                variant="outlined" 
                                sx={actionButtonSx}
                                data-testid={`transactionDelete-${index}`}
                                aria-label='Delete transaction'
                                onClick={() => deleteTransaction(item, index)}>
                                    <DeleteIcon/>
                            </Button>
                        </div>
                    }
                </div>
            </li>
        );
    };

    const renderSwitch = (items) => {
        switch(true) {
            case (items.length > 1):
                return sortTransactions(items).map((item, index) => renderTransaction(item, index));
            case (items.length === 1):
                return renderTransaction(items[0], 0);
                
            // case for 0 transactions
            default:
                return <div className='m-auto text-center font-medium text-slate-600 dark:text-zinc-400'>Transaction list empty{!props.modalOn && ', add a goal in Manage Transactions'}</div>;
        }
    };

return (
    <div className={`${ props.modalOn ? 'basis-40 sm:basis-5/12 sm:max-h-screen md:basis-2/3 xl:basis-3/6' : 'w-full flex-1 min-h-0'} h-full overflow-y-auto`}>
        <ul className="flex flex-col gap-3 pr-1 xl:pr-3" data-testid={props.modalOn ? 'transactionsListModal' : 'transactionsList'}>
            {renderSwitch(props.allTransactions)}
        </ul>
    </div>
    );
}

export default Transactions;