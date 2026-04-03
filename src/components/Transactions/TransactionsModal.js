import React, { useState } from 'react';
import Transactions from './Transactions';
import TransactionsForm from'./TransactionsForm';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import { getDatabase, ref, push, set, onValue, remove, update } from "firebase/database";
import Button from '@mui/material/Button';
import EditDialogBox from '../EditDialogBox';
import SuccessSnackbar from '../SuccessSnackbar';
import ErrorSnackbar from '../ErrorSnackbar';
import DeleteSnackbar from '../DeleteSnackbar';

function TransactionsModal(props) {
    const [ user ] = useAuthState(auth);
    // Represents all transactions, read from database
    const [ allTransactions, setAllTransactions ] = useState([]);
    const [ modalOn, setModalOn ] = useState(false);
    const [ formOn, setFormOn ] = useState(false);
    // Sets edit mode on, necessary for useEffect in TransactionsForm to fill the form with correct values at right time, exiting while editing (with cancel and X) & dialog box
    const [ editOn, setEditOn ] = useState(false);
    const [ transactionToEdit, setTransactionToEdit ] = useState(null); 
    const [ successSnackbarOn, setSuccessSnackbarOn ] = useState(false);
    const [ errorSnackbarOn, setErrorSnackbarOn ] = useState(false);
    const [ deleteSnackbarOn, setDeleteSnackbarOn ] = useState(false);
    const [ dialogBoxOn, setDialogBoxOn ] = useState(false);
    const [ exitWithCancelOn, setExitWithCancelOn ] = useState(false);

    const toSetFormOn = () => {
        setFormOn(true);
    };

    const toSetFormOff = () => {
        setFormOn(false);
        setExitWithCancelOn(false);
    };

    const toSetModalOn = () => {
        setModalOn(true);
        window.scroll(0, 0);
        const body = document.querySelector("body");
        body.style.overflow = "hidden";
    }

    const toSetModalOff = () => {
        setExitWithCancelOn(false);
        // alerts with dialog box while transaction is being edited
        if(editOn){
            setDialogBoxOn(true);
        } else {
            setModalOn(!modalOn);
            setFormOn(false);
            setEditOn(false);
            const body = document.querySelector("body");
            body.style.overflow = "auto";
            toSetSuccessSnackbarOff();
            toSetErrorSnackbarOff();
            toSetDeleteSnackbarOff();
        }
    };

    const toSetEditOn = () => {
        setEditOn(true);
    };

    const toSetEditOff = () => {
        setEditOn(false);
    };

    // Sets which goal to edit, turn on form  & edit mode for GoalsForm useEffect
    const editTransaction = (transactionToEdit, index) => {
        setTransactionToEdit(transactionToEdit, index);
        setEditOn(true);
        setFormOn(true);
    };

    const toSetAllTransactions = (newTransactions) => {
        setAllTransactions(newTransactions);
    };

    const toSetExitWithCancelOn = () => {
        setExitWithCancelOn(true);
    }

    // Open / turn off the dialog box from cancel (in form while editing)
    const toSetDialogBoxOn = () => {
        setDialogBoxOn(true);
    };
        
    const toSetDialogBoxOff = () => {
        setDialogBoxOn(false);
    };

    // Called when pressing 'exit anyway' on dialog box after pressing x
    const exitDialogWithX = () => {
        setExitWithCancelOn(false);
        setModalOn(false);
        setFormOn(false);
        setEditOn(false);
        setDialogBoxOn(false);
        const body = document.querySelector("body");
        body.style.overflow = "auto";
    }

    // Called when pressing 'exit anyway' on dialog box after pressing cancel
    const exitDialogWithCancel = () => {
        setFormOn(false);
        setEditOn(false);
        setDialogBoxOn(false);
        setExitWithCancelOn(false);
        const body = document.querySelector("body");
        body.style.overflow = "auto";
    }

    // Turns off success snackbar alert
    const toSetSuccessSnackbarOff = () => {
        setSuccessSnackbarOn(false);
    };

    const toSetErrorSnackbarOff = () => {
        setErrorSnackbarOn(false);
    };

    const toSetDeleteSnackbarOff = () => {
        setDeleteSnackbarOn(false);
    };

    const createTransaction = (newTransaction) =>{
        const db = getDatabase();
        const dbTransactionRef = ref(db, user.uid + '/transactions');
        const newTransactionPostRef = push(dbTransactionRef);
        set(newTransactionPostRef, {
            ...newTransaction
        })
        .then(() => {
            setSuccessSnackbarOn(true);
        })
        .catch(() => {
            setErrorSnackbarOn(true);
        })
        setEditOn(false);
    };

    const deleteTransaction = (transacitonToDelete, index, editOnTrue) => {
        const idToDel = transacitonToDelete.id;
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/transactions');
        onValue(dbRef, (snapshot) => {
                snapshot.forEach((childSnapshot) => {
                    const childKey = childSnapshot.key;
                    const childData = childSnapshot.val();
                    if(childData.id === idToDel){
                        let newTransactions = allTransactions;
                        newTransactions.splice(index, 1);
                        setAllTransactions(newTransactions);
                        remove(ref(db, user.uid + `/transactions/${childKey}`))
                        .then(() => {
                            if(!editOnTrue){
                                setDeleteSnackbarOn(true);
                            }
                        })
                        .catch(() => {
                            setErrorSnackbarOn(true);
                        });
                    }
                })
        },{onlyOnce: true});
        reflectDeleteTransaction(transacitonToDelete);
    };

    // deletes amount in corresponding account (so amount in accounts will always equal transactions)
    const reflectDeleteTransaction = (formValues) => {
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/accounts/');
        let accountTotal = 0;
        // accountId will add up correct path to the transaction we're deleting
        let accountId = `${user.uid}/accounts/`;
        onValue(dbRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childData = childSnapshot.val();
                if(childData.name === formValues.account){
                    accountId += `${childSnapshot.key}`;
                    if(formValues.positive){
                        accountTotal = +childData.total - +(parseFloat(formValues.value)).toFixed(2);
                    } else {
                        accountTotal = +childData.total + +(parseFloat(formValues.value)).toFixed(2);
                    }
                }
                // if the transaction has a transferTo value, then delete its value from account that it was transfered to
                if(formValues.transferTo){
                    let transferToId = `${user.uid}/accounts/`;
                    if(childData.name === formValues.transferTo){
                        transferToId += `${childSnapshot.key}`;
                        let newTransferToTotal = +parseFloat(childData.total) - +parseFloat(formValues.value);
                        let transferUpdatedRef = ref(db, transferToId);
                        update(transferUpdatedRef, {total: newTransferToTotal.toFixed(2)});
                    }
                }
            })
        },{onlyOnce: true});
        let updatedRef = ref(db, accountId);
        update(updatedRef, {total: accountTotal.toFixed(2)});
    }

    return (
        <section id="transactions" className="w-full order-2 xl:col-span-4 xl:col-start-4 xl:row-span-2 xl:row-start-1 xl:w-full">
            <div className="enterprise-panel m-0 flex min-h-0 w-full flex-col gap-3 overflow-hidden bg-slate-900/50 p-6 shadow-xl">
                <header className="flex justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Transactions</h2>
                    <Button sx={props.buttonStyles} 
                        onClick={() => toSetModalOn()} 
                        tabIndex={props.showNav || modalOn ? -1 : 0}
                        data-testid="transactionsModalOpen">
                        Manage Transactions
                    </Button>
                </header>
                <Transactions 
                    allTransactions={allTransactions}
                    toSetAllTransactions={toSetAllTransactions}
                    darkMode={props.darkMode}/>
            </div>
            {modalOn && 
                <div className="enterprise-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-3">
                    <DeleteSnackbar
                        message='Transaction deleted.'
                        deleteSnackbarOn={deleteSnackbarOn}
                        toSetDeleteSnackbarOff={toSetDeleteSnackbarOff}/>
                    <ErrorSnackbar
                        message='Error with transaction.'
                        errorSnackbarOn={errorSnackbarOn}
                        toSetErrorSnackbarOff={toSetErrorSnackbarOff}/>
                    <SuccessSnackbar
                        message='Transaction created!' 
                        successSnackbarOn={successSnackbarOn} 
                        toSetSuccessSnackbarOff={toSetSuccessSnackbarOff}/>
                    <EditDialogBox 
                        buttonStyles={props.buttonStyles}
                        theme={props.theme}
                        dialogBoxOn={dialogBoxOn}
                        toSetDialogBoxOff={toSetDialogBoxOff}
                        toSetDialogBoxOffAndClearGoal={exitWithCancelOn ? exitDialogWithCancel : exitDialogWithX} 
                        dialogTitle="Exit while editing your transaction?"
                        dialogText="Exiting now will cause the transaction you are editing to be lost."/>
                    <article className="enterprise-modal-panel container h-[37rem] w-full p-4 sm:max-h-[98vh] md:w-11/12 md:max-h-[60%] lg:max-h-[85%] xl:max-w-[50%]">
                        <header className="flex justify-between">
                            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Transactions</h2>
                            <Button onClick={() => toSetModalOff()}
                                className="btn" 
                                size="small" 
                                sx={props.buttonStyles}
                                data-testid="transactionsModalClose">
                                Exit
                            </Button>
                        </header>
                        <div className="flex gap-2 mt-2 h-5/6 m-auto justify-center md:w-11/12 md:gap-3 xl:gap-10">
                            <Transactions
                                modalOn={modalOn}
                                toSetAllTransactions={toSetAllTransactions}
                                allTransactions={allTransactions}
                                deleteTransaction={deleteTransaction}
                                editOn={editOn}
                                editTransaction={editTransaction}
                                darkMode={props.darkMode}/>
                            <TransactionsForm 
                                formOn={formOn}
                                toSetFormOn={toSetFormOn}
                                toSetFormOff={toSetFormOff}
                                editOn={editOn}
                                transactionToEdit={transactionToEdit}
                                toSetEditOn={toSetEditOn}
                                toSetEditOff={toSetEditOff}
                                toSetExitWithCancelOn={toSetExitWithCancelOn}
                                toSetDialogBoxOn={toSetDialogBoxOn}
                                createTransaction={createTransaction}
                                deleteTransaction={deleteTransaction}
                                buttonStyles={props.buttonStyles}
                                inputStyles={props.inputStyles}
                                theme={props.theme}/>
                        </div>
                    </article>
                </div>
            }
        </section>
    );
}

export default TransactionsModal;