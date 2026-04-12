import React, { useEffect } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import { useLanguage } from '../../context/LanguageContext';
import { formatMoney } from '../../utils/formatters';

function Accounts(props) {
    const { t, locale } = useLanguage();
    const [ user ] = useAuthState(auth);
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
        const dbRef = ref(db, user.uid + '/accounts');
        let newAccounts = [];
        onValue(dbRef, (snapshot) => {
            newAccounts = [];
            snapshot.forEach((childSnapshot) => {
                const childData = childSnapshot.val();
                if(!childData.id){
                    const baseAccounts = Object.values(childData);
                    newAccounts.push(...baseAccounts);
                } else {
                    newAccounts.push(childData);
                }
                props.toSetAllAccounts(newAccounts);
        })});
    }, []); // eslint-disable-line

    const editAccount = (accountToEdit, index) => {
        props.editAccount(accountToEdit, index);
        props.deleteAccount(accountToEdit, index, true);
    };

    const deleteAccount = (accountToDelete, index) => {
        props.deleteAccount(accountToDelete, index);
    };

    const sortAccounts = (accounts) => {
        let sortedBaseArray = [];
        let sortedArray = [];
        let index = 0;
        while(index <= accounts.length -1){
            if(accounts[index].hasOwnProperty('notEditable')){
                sortedBaseArray.push(accounts[index]);
                index += 1;
            } else {
                sortedArray.push(accounts[index]);
                index += 1;
            }
        }
        sortedBaseArray.push(...sortedArray);
        sortedBaseArray = sortedBaseArray.flat();
        return sortedBaseArray;
    };

    const getAccountTone = (account) => {
        return ((Number(account.total) > 0) || (!account.debit && Number(account.total) === 0)) ? 'text-emerald-600' : 'text-red-600';
    };

    const renderAccounts = (allAccounts) => {
            return (
                sortAccounts(allAccounts).map((account, index) => {
                    return (
                        <li key={account.id} className='enterprise-stat-card flex flex-col gap-2 px-3 py-2' data-testid={`account-${index}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <h3 className="truncate text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-zinc-500">{account.name}</h3>
                                    <h4 className="pt-1 text-[11px] font-medium text-slate-600 dark:text-zinc-400">{account.debit ? t('accounts.debitAccount') : t('accounts.creditFacility')}</h4>
                                </div>
                                <div className="text-right">
                                    <h5 data-testid={`account-total${index}`} className={`${getAccountTone(account)} text-sm font-semibold tabular-nums md:text-base`}>
                                        {formatMoney(account.total, 'USD', locale)}
                                    </h5>
                                </div>
                            </div>
                            <div className="flex justify-end gap-1">
                                {props.modalOn && !account.notEditable &&
                                    <Button onClick={() => editAccount(account, index)} size="small" variant="outlined"
                                        aria-label='Edit account'
                                        data-testid={`accountEdit-${index}`}
                                        disabled={props.editOn ? true : false}
                                        sx={actionButtonSx}>
                                        <EditIcon/>
                                    </Button>}
                                {props.modalOn && !account.notEditable && 
                                    <Button onClick={() => deleteAccount(account, index)} size="small" variant="outlined"
                                        aria-label="Delete account"
                                        data-testid={`accountDelete-${index}`}
                                        sx={actionButtonSx}>
                                        <DeleteIcon/>
                                    </Button>}
                            </div>
                        </li>
                    )
                })
            )
    };

    return (
        <article className={`${ props.modalOn ? 'basis-1/2 md:basis-1/3 overflow-x-auto overflow-y-hidden xl:basis-1/2' : 'w-full flex-1 min-h-0 overflow-x-hidden overflow-y-auto'} h-full xl:overflow-y-auto xl:overflow-x-hidden`}>
            <ul data-testid={props.modalOn ? 'accountsListModal' : 'accountsList'} className={`flex gap-3 ${props.modalOn ? 'flex-row items-center xl:flex-col' : 'flex-col'}`}>
                {renderAccounts(props.allAccounts)}
            </ul>
        </article>
    );
}

export default Accounts;
