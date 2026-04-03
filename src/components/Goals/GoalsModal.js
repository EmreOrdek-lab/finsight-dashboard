import React, { useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import { getDatabase, ref, push, set, onValue, remove } from "firebase/database";
import Goals from './Goals';
import GoalsForm from './GoalsForm';
import Button from '@mui/material/Button';
import EditDialogBox from '../EditDialogBox';
import SuccessSnackbar from '../SuccessSnackbar';
import ErrorSnackbar from '../ErrorSnackbar';
import DeleteSnackbar from '../DeleteSnackbar';

function GoalsModal(props) {
    const [ user ] = useAuthState(auth);
    // Represents all goals, read from database
    const [ allGoals, setAllGoals ] = useState([]);
    const [ modalOn, setModalOn ] = useState(false);
    const [ formOn, setFormOn ] = useState(false);
    // Sets edit mode on, necessary for useEffect in GoalsForm, exiting while editing (with cancel and X) & dialog box
    const [ editOn, setEditOn ] = useState(false);
    const [ goalToEdit, setGoalToEdit ] = useState(null); 
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
        // alerts with dialog box while goal is being edited
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
    const editGoal = (goalToEdit, index) => {
        setGoalToEdit(goalToEdit, index);
        setEditOn(true);
        setFormOn(true);
    };

    const toSetAllGoals = (newGoals) => {
        setAllGoals(newGoals);
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

    const createGoal = (cleanFormValues) =>{
        const db = getDatabase();
        const postListRef = ref(db, user.uid + '/goals');
        const newPostRef = push(postListRef);
        set(newPostRef, {
            ...cleanFormValues
        })
        .then(() => {
            setSuccessSnackbarOn(true);
        })
        .catch(() => {
            setErrorSnackbarOn(true);
        })
        setEditOn(false);
    };

    const deleteGoal = (goalToDelete, index, editOnTrue) => {
        const idToDel = goalToDelete.id;
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/goals');
        onValue(dbRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childKey = childSnapshot.key;
                const childData = childSnapshot.val();
                if(childData.id === idToDel){
                    let newgoal = allGoals;
                    newgoal.splice(index, 1);
                    setAllGoals(newgoal);
                    remove(ref(db, user.uid + `/goals/${childKey}`))
                    .then(() => {
                        if(!editOnTrue){
                            setDeleteSnackbarOn(true);
                        }
                    })
                    .catch(() => {
                        setErrorSnackbarOn(true);
                    })
                }
        })},
        {onlyOnce: true});
    };

    return (
        <section id="goals" className="w-full order-3 xl:col-span-3 xl:col-start-1 xl:row-span-1 xl:row-start-2 xl:w-full">
            <div className="enterprise-panel -mt-4 flex h-full w-full flex-col gap-3 bg-slate-900/50 p-6 shadow-xl">
                <header className="flex justify-between">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                        Goals
                    </h2>
                    <Button onClick={() => toSetModalOn()} 
                        sx={props.buttonStyles} 
                        tabIndex={props.showNav || modalOn ? -1 : 0}
                        data-testid='goalsModalOpen'>
                        Manage Goals
                    </Button>
                </header>
                <Goals 
                    allGoals={allGoals}
                    toSetAllGoals={toSetAllGoals}
                    darkMode={props.darkMode}/>
            </div>
            {modalOn &&
            <div className='enterprise-overlay fixed inset-0 z-50 flex flex-col items-center justify-center p-3'>
                <DeleteSnackbar
                    message='Goal deleted.'
                    deleteSnackbarOn={deleteSnackbarOn}
                    toSetDeleteSnackbarOff={toSetDeleteSnackbarOff}/>
                <ErrorSnackbar
                    message='Error with goal.'
                    errorSnackbarOn={errorSnackbarOn}
                    toSetErrorSnackbarOff={toSetErrorSnackbarOff}/>
                <SuccessSnackbar 
                    message='Goal created!'
                    successSnackbarOn={successSnackbarOn} 
                    toSetSuccessSnackbarOff={toSetSuccessSnackbarOff}/>
                <EditDialogBox 
                    buttonStyles={props.buttonStyles}
                    theme={props.theme}
                    dialogBoxOn={dialogBoxOn}
                    toSetDialogBoxOff={toSetDialogBoxOff} 
                    toSetDialogBoxOffAndClearGoal={exitWithCancelOn ? exitDialogWithCancel : exitDialogWithX} 
                    dialogTitle="Exit while editing your goal?"
                    dialogText="Exiting now will cause the goal you are editing to be lost."/>
                <article className="enterprise-modal-panel h-[30rem] w-full p-4 md:w-10/12 md:max-h-[60%] lg:max-h-[80%] xl:max-h-[80%] xl:max-w-[50%]">
                    <header className="flex justify-between">
                        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Goals</h3>
                        <Button onClick={() => toSetModalOff()} 
                            sx={props.buttonStyles} 
                            size='small'
                            data-testid="goalsModalClose">
                            Exit
                        </Button>
                    </header>
                    <div className="flex flex-col gap-2 sm:gap-1 xl:gap-5">
                        <Goals
                            modalOn={modalOn}
                            toSetAllGoals={toSetAllGoals}
                            allGoals={allGoals}
                            editOn={editOn}
                            deleteGoal={deleteGoal}
                            editGoal={editGoal}
                            darkMode={props.darkMode}/>
                        <GoalsForm
                            formOn={formOn}
                            toSetFormOn={toSetFormOn}
                            toSetFormOff={toSetFormOff}
                            editOn={editOn}
                            goalToEdit={goalToEdit}
                            toSetEditOn={toSetEditOn}
                            toSetEditOff={toSetEditOff}
                            toSetExitWithCancelOn={toSetExitWithCancelOn}
                            toSetDialogBoxOn={toSetDialogBoxOn}
                            createGoal={createGoal}
                            deleteGoal={deleteGoal}
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

export default GoalsModal;