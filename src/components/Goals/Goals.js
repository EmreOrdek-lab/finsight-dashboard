import React, { useEffect, useState } from 'react';
import { getDatabase, ref, onValue } from "firebase/database";
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '../../config/Firebase';
import Button from '@mui/material/Button';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import LinearProgress from '@mui/material/LinearProgress';

function Goals(props) {
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

    // Get all goals from database & store in an array to render on screen
    useEffect(()=> {
        const db = getDatabase();
        const dbRef = ref(db, user.uid + '/goals');
        onValue(dbRef, (snapshot) => {
            snapshot.forEach((childSnapshot) => {
                const childData = childSnapshot.val();
                // if values id is found in the allgoals array dont add it
                let check = props.allGoals.some(item => item.id === childData.id);
                if(!check){
                    let oldGoals = props.allGoals;
                    oldGoals.push(childData);
                    props.toSetAllGoals(oldGoals);
                }
                setCount(count + 1);
            })});
    }, []); // eslint-disable-line
    
    const deleteGoal = (goalToDelete, index) => {
        props.deleteGoal(goalToDelete, index);
    }

    const editGoal = (goal, index) => {
        props.editGoal(goal, index);
        props.deleteGoal(goal, index, true);
    }

    const goalBarColor = (goal) => {
        let goalColor = Math.floor((goal.current / goal.total) * 100);
        return `hsl(${goalColor}, 100%, 50%)`;
    }

    const renderBackgroundColor = () => {
        return props.theme === 'dark' ? '#D7CDFF' : 'rgb(224 231 255)';
    }

    const formatMoney = (money) => {
        let formattedMoney = money.split('.');
        return (
            <div className="flex">
                <div className="text-xs pt-1">$</div>
                <div>{formattedMoney[0]}</div>
                <div className="text-xs pt-1">{formattedMoney[1] && `.${formattedMoney[1]}`}</div>
            </div>
        )
    }

    const renderSwitch = (goalList) => {
        switch(true) {
            // case for 1 transaction
            case (goalList.length === 1):
                return (
                    <li key={goalList[0].id} data-testid={`goal-0`} className="w-full xl:pb-2">
                        <div className={`flex flex-col items-stretch text-left ${props.modalOn ? 'gap-1' : 'gap-2'}`}>
                            <h3 className='w-full font-medium text-slate-900 dark:text-slate-100 sm:text-sm xl:text-base'>{goalList[0].name}</h3>
                            <div className="relative w-full">
                                <LinearProgress variant="determinate" value={Math.floor(goalList[0].current / goalList[0].total * 100)}
                                    sx={{
                                        backgroundColor: renderBackgroundColor(),
                                        '& .MuiLinearProgress-bar': {
                                                backgroundColor: goalBarColor(goalList[0])
                                                },
                                        height: 12,
                                        borderRadius: 1,
                                        width: '100%'
                                    }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 dark:text-slate-100">
                                    {Math.floor(goalList[0].current / goalList[0].total * 100)}
                                    <span>%</span>
                                </div>
                            </div>
                            <h4 className='flex w-full justify-between gap-1 pt-1 text-xs font-medium text-slate-900 dark:text-slate-100'>
                                {formatMoney(goalList[0].current)}
                                <span>/</span>
                                {formatMoney(goalList[0].total)}
                            </h4> 
                            <div className="flex justify-end gap-1">
                                {props.modalOn &&
                                    <Button onClick={() => editGoal(goalList[0], 0)} size="small" variant="outlined"
                                        disabled={props.editOn ? true : false}
                                        aria-label='Edit goal'
                                        data-testid={`goalEdit-0`}
                                        sx={actionButtonSx}>
                                        <EditIcon/>
                                    </Button>
                                }
                                {props.modalOn &&
                                    <Button onClick={() => deleteGoal(goalList[0], 0)} size="small" variant="outlined"
                                        aria-label='Delete goal'
                                        data-testid={`goalDelete-0`}
                                        sx={actionButtonSx}>
                                        <DeleteIcon/>
                                    </Button>
                                }
                            </div>
                        </div>
                    </li>
                );

            // case for multiple transactions
            case (goalList.length > 1):
                return (
                    goalList.map((goal, index) => {
                        return(
                            <li key={goal.id} data-testid={`goal-${index}`} className="flex w-full xl:pb-2">
                                <div className={`flex w-full flex-col items-stretch text-left ${props.modalOn ? 'gap-1' : 'gap-2'}`}>
                                    <h3 className='w-full font-medium text-slate-900 dark:text-slate-100 sm:text-sm xl:text-base'>{goal.name}</h3>
                                    <div className="relative w-full">
                                        <LinearProgress variant="determinate" value={Math.floor(goal.current / goal.total * 100)}
                                            sx={{
                                                backgroundColor: renderBackgroundColor(),
                                                '& .MuiLinearProgress-bar': {
                                                        backgroundColor: goalBarColor(goal)
                                                        },
                                                height: 12,
                                                borderRadius: 1,
                                                width: '100%'
                                        }} />
                                        <div className='absolute inset-0 flex items-center justify-center text-xs font-semibold text-slate-900 dark:text-slate-100'>
                                            {Math.floor(goal.current / goal.total * 100)}
                                            <span>%</span>
                                        </div>
                                    </div>
                                    <h4 className='flex w-full justify-between gap-1 pt-1 text-xs font-medium text-slate-900 dark:text-slate-100'>
                                        {formatMoney(goal.current)}
                                        <span>/</span>
                                        {formatMoney(goal.total)}
                                    </h4>
                                    <div className="flex justify-end gap-1">
                                        {props.modalOn &&
                                        <Button onClick={() => editGoal(goal, index)} size="small" variant="outlined"
                                            disabled={props.editOn ? true : false}
                                            aria-label='Edit goal'
                                            data-testid={`goalEdit-${index}`}
                                            sx={actionButtonSx}>
                                            <EditIcon/>
                                        </Button>}
                                        {props.modalOn && 
                                        <Button onClick={() => deleteGoal(goal, index)} size="small" variant="outlined"
                                            data-testid={`goalDelete-${index}`}
                                            aria-label='Delete goal'
                                            sx={actionButtonSx}>
                                            <DeleteIcon/>
                                        </Button>}

                                    </div>
                                </div>
                            </li>
                        );
                    })
                );
                
            // case for 0 transactions
            default:
                return <div className='m-auto p-3 text-center font-medium text-slate-600 dark:text-zinc-400'>Goal list empty{!props.modalOn && ', add a goal in Manage Goals'}</div>;
        }
    };

    return (
        <article className="relative h-full w-full">
            <ul data-testid={props.modalOn ? 'goalsListModal' : 'goalsList'} className="flex w-full flex-col gap-3 overflow-visible py-2">
                {renderSwitch(props.allGoals)}
            </ul>
        </article>
    );
}

export default Goals;