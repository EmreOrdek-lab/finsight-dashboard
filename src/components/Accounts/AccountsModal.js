import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import { getDatabase, ref, push, set, onValue, remove } from "firebase/database";
import Accounts from './Accounts';
import AccountsForm from './AccountsForm';
import Button from '@mui/material/Button';
import EditDialogBox from '../EditDialogBox';
import SuccessSnackbar from '../SuccessSnackbar';
import ErrorSnackbar from '../ErrorSnackbar';
import DeleteSnackbar from '../DeleteSnackbar';
import { appendAuditEntry } from '../../services/auditService';
import { useLanguage } from '../../context/LanguageContext';

function AccountsModal(props) {
    const { t } = useLanguage();
    const [ user ] = useAuthState(auth);
    // Represents all Accounts, read from database
    const [ allAccounts, setAllAccounts ] = useState([]);
    const [ modalOn, setModalOn ] = useState(false);
    const [ formOn, setFormOn ] = useState(false);

    const [ editOn, setEditOn ] = useState(false);
    const [ accountToEdit, setAccountToEdit ] = useState(null); 
    const [ successSnackbarOn, setSuccessSnackbarOn ] = useState(false);
    const [ errorSnackbarOn, setErrorSnackbarOn ] = useState(false);
    const [ deleteSnackbarOn, setDeleteSnackbarOn ] = useState(false);
    const [ dialogBoxOn, setDialogBoxOn ] = useState(false);
    const [ exitWithCancelOn, setExitWithCancelOn ] = useState(false);
    const canManageAccounts = props.permissions?.manageAccounts;

    const toSetFormOn = () => {
        setFormOn(true);
    };

    const toSetFormOff = () => {
        setFormOn(false);
        setExitWithCancelOn(false);
    };

    const toSetModalOn = () => {
        if(!canManageAccounts){
            return;
        }
        setModalOn(true);
        const body = document.querySelector("body");
        body.style.overflow = "hidden";
    };

    const toSetModalOff = () => {
        setExitWithCancelOn(false);
        // alerts with dialog box while goal is being edited
        if(editOn){
            setDialogBoxOn(true);
        } else {
            setModalOn(!modalOn);
            setFormOn(false);
            const body = document.querySelector("body");
            body.style.overflow = "auto";
            setEditOn(false);
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
    const editAccount = (goalToEdit, index) => {
        setAccountToEdit(goalToEdit, index);
        setEditOn(true);
        setFormOn(true);
    };

    const toSetAllAccounts = (newAccounts) => {
        setAllAccounts(newAccounts);
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
        setModalOn(!modalOn);
        setFormOn(false);
        setEditOn(false);
        setDialogBoxOn(false);
    }

    // Called when pressing 'exit anyway' on dialog box after pressing cancel
    const exitDialogWithCancel = () => {
        setFormOn(false);
        setEditOn(false);
        setDialogBoxOn(false);
        setExitWithCancelOn(false);
    }

    // Turns off creation, deletion & error snackbar alert
    const toSetSuccessSnackbarOff = () => {
        setSuccessSnackbarOn(false);
    };

    const toSetErrorSnackbarOff = () => {
        setErrorSnackbarOn(false);
    };

    const toSetDeleteSnackbarOff = () => {
        setDeleteSnackbarOn(false);
    };

    const createAccount = (cleanFormValues) =>{
        if(!canManageAccounts){
            return;
        }
        const db = getDatabase();
        const postListRef = ref(db, user.uid + '/accounts');
        const newPostRef = push(postListRef);
        set(newPostRef, {
            ...cleanFormValues
        })
        .then(() => {
            setSuccessSnackbarOn(true);
            appendAuditEntry(user.uid, {
                action: editOn ? 'updated' : 'created',
                domain: 'accounts',
                entityType: 'account',
                actorRole: props.baseRole,
                summary: `${cleanFormValues.name} account ${editOn ? 'updated' : 'created'}.`,
                severity: 'info',
            });
        })
        .catch(() => {
            setErrorSnackbarOn(true);
        })
        setEditOn(false);
    };

    const deleteAccount = (accountToDelete, index, editOnTrue) => {
        if(!canManageAccounts){
            return;
        }
        const idToDel = accountToDelete.id;
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/accounts');
        onValue(dbRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childKey = childSnapshot.key;
                const childData = childSnapshot.val();
                if(childData.id === idToDel){
                    let newAccounts = allAccounts;
                    newAccounts.splice(index, 1);
                    setAllAccounts(newAccounts);
                    remove(ref(db, user.uid + `/accounts/${childKey}`))
                    .then(() => {
                        if(!editOnTrue){
                            setDeleteSnackbarOn(true);
                            appendAuditEntry(user.uid, {
                                action: 'deleted',
                                domain: 'accounts',
                                entityType: 'account',
                                actorRole: props.baseRole,
                                summary: `${accountToDelete.name} account removed.`,
                                severity: 'warning',
                            });
                        }
                    })
                    .catch(() => {
                        setErrorSnackbarOn(true);
                    })
                }
            })
        },
        {onlyOnce: true});
    };

    return (
        <section id="accounts" className="w-full order-1 xl:col-span-3 xl:col-start-1 xl:row-span-1 xl:row-start-1 xl:w-full">
            <div className="enterprise-panel flex h-80 min-h-0 w-full flex-col gap-3 overflow-hidden bg-slate-900/50 p-6 shadow-xl xl:h-full xl:max-h-[600px]">
                <header className="flex justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        {t('accounts.title')}
                    </h2>
                    <Button sx={props.buttonStyles} 
                        aria-expanded={modalOn ? 'true' : 'false'} 
                        onClick={() => toSetModalOn()} 
                        variant='contained'
                        disabled={!canManageAccounts}
                        tabIndex={props.showNav || modalOn ? -1 : 0}
                        data-testid="accountsModalOpen">
                        {t('accounts.manage')}
                    </Button>
                </header>
                {!canManageAccounts && (
                    <div className="text-sm text-slate-600 dark:text-zinc-400">
                        {t('accounts.readOnly')}
                    </div>
                )}
                <Accounts
                    allAccounts={allAccounts}
                    toSetAllAccounts={toSetAllAccounts}
                    darkMode={props.darkMode}/>
            </div>
            { modalOn && 
            <div className='enterprise-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-3'>
                <DeleteSnackbar
                    message={t('accounts.deleted')}
                    deleteSnackbarOn={deleteSnackbarOn}
                    toSetDeleteSnackbarOff={toSetDeleteSnackbarOff}/>
                <ErrorSnackbar
                    message={t('accounts.createError')}
                    errorSnackbarOn={errorSnackbarOn}
                    toSetErrorSnackbarOff={toSetErrorSnackbarOff}/>
                <SuccessSnackbar 
                    message={t('accounts.created')}
                    successSnackbarOn={successSnackbarOn} 
                    toSetSuccessSnackbarOff={toSetSuccessSnackbarOff}/>
                <EditDialogBox 
                    buttonStyles={props.buttonStyles}
                    theme={props.theme}
                    dialogBoxOn={dialogBoxOn}
                    toSetDialogBoxOff={toSetDialogBoxOff} 
                    toSetDialogBoxOffAndClearGoal={exitWithCancelOn ? exitDialogWithCancel : exitDialogWithX} 
                    dialogTitle={t('accounts.exitWhileEditing')}
                    dialogText={t('accounts.exitWhileEditingText')}/>
                <article className='enterprise-modal-panel container h-4/6 w-full max-h-96 p-4 sm:m-auto sm:h-[90vh] md:w-10/12 md:max-h-[60%] xl:flex xl:max-w-[50%] xl:flex-col'>
                    <header className="flex justify-between">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t('accounts.title')}</h2>
                        <Button sx={props.buttonStyles} 
                            onClick={() => toSetModalOff()} 
                            data-testid="accountsModalClose">
                            {t('common.exit')}
                        </Button>
                    </header>
                    <div className="flex gap-2 flex-col mt-2 h-5/6 justify-center sm:gap-3 xl:flex-row xl:w-11/12 xl:m-auto xl:gap-10">
                        <Accounts
                            modalOn={modalOn}
                            allAccounts={allAccounts}
                            toSetAllAccounts={toSetAllAccounts}
                            darkMode={props.darkMode}
                            editOn={editOn}
                            editAccount={editAccount}
                            deleteAccount={deleteAccount}/>
                        <AccountsForm
                            formOn={formOn}
                            allAccounts={allAccounts}
                            toSetFormOn={toSetFormOn}
                            toSetFormOff={toSetFormOff}
                            editOn={editOn}
                            accountToEdit={accountToEdit}
                            toSetEditOn={toSetEditOn}
                            toSetEditOff={toSetEditOff}
                            toSetExitWithCancelOn={toSetExitWithCancelOn}
                            toSetDialogBoxOn={toSetDialogBoxOn}
                            createAccount={createAccount}
                            deleteAccount={deleteAccount}
                            buttonStyles={props.buttonStyles}
                            inputStyles={props.inputStyles}/>
                    </div>
                </article>
            </div>
            }
        </section>
    );
}

export default AccountsModal;
