import React, { useState } from 'react';
import { auth } from '../../config/Firebase';
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import TextField from '@mui/material/TextField';
import { getDatabase, ref, update } from "firebase/database";
import Button from '@mui/material/Button';
import capitalizeName from '../capitalizeName';
import ErrorIcon from '@mui/icons-material/Error';
import { DEFAULT_BUDGET_TEMPLATES } from '../../services/workspaceGovernanceService';
import { useLanguage } from '../../context/LanguageContext';

function Register(props) {
    const { t } = useLanguage();
    const initialUserInfo = {name: "", email: "", password:""};
    const [ userInfo, setUserInfo ] = useState(initialUserInfo);
    const [ formErrors, setFormErrors] = useState({});
    const [ loginError, setLoginError ] = useState(null);

    const handleChange = (e) => {
       const { name, value } = e.target;
       setUserInfo({...userInfo, [name]: value});
       setFormErrors({...formErrors, [name]: null});
       setLoginError(null);
    };

    const validate = (values) => {
        const errors = {};
        if(!values.name){
            errors.name = t('register.nameRequired');
        }
        // follow email format
        if(!values.email.includes('@') || !values.email.includes('.')){
            errors.email = t('register.mustBeValidEmail');
        }
        if(!values.email){
            errors.email = t('register.emailRequired');
        }
        if(values.password.length < 6 ){
            errors.password = t('register.passwordMin');
        }
        if(!values.password){
            errors.password = t('register.passwordRequired');
        }
        return errors;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validate(userInfo);
        setFormErrors(errors);
        setLoginError(null);

        if(Object.keys(errors).length === 0){
            registerFirebase();
        }
    };

    const registerFirebase = () =>{
        createUserWithEmailAndPassword(auth, userInfo.email, userInfo.password)
        .then((userCredential) =>{
            updateProfile(auth.currentUser, {
                displayName: `${userInfo.name}`})
            const user = userCredential.user;

            setUserInfo({});

            // when account is registered, generic starting accounts & user info are pushed to the database
            const newUserAccounts = {
                'Checking': {name: 'Checking', debit: true, total: 0, id:Math.random()*1000, notEditable:true},
                'Savings': {name: 'Savings', debit: true, total: 0, id:Math.random()*1000, notEditable:true},
                'Credit Card':{name: 'Credit Card', debit: false, total: 0, id:Math.random()*1000, notEditable:true}
            }

            const db = getDatabase();
            const accountsRef = ref(db, user.uid + '/accounts');
            update(accountsRef, newUserAccounts);

            const defaultBudgets = DEFAULT_BUDGET_TEMPLATES.reduce((acc, budget) => {
                const key = budget.category.toLowerCase().replace(/\s+/g, '-');
                acc[key] = {
                    id: `budget-${key}`,
                    category: budget.category,
                    planned: budget.planned,
                    owner: budget.owner,
                    criticality: budget.criticality,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                };
                return acc;
            }, {});
            const budgetsRef = ref(db, user.uid + '/budgets');
            update(budgetsRef, defaultBudgets);

            const getInitials = (name) => {
                var initials = [];
                initials.push(name[0].toUpperCase());
                for (var i = 0; i < name.length; i++) {
                  if (name[i] === ' ') {
                    initials.push(name[i + 1].toUpperCase());
                  }
                }
                return initials.join('');
            };

            const userData = {
                name: `${capitalizeName(userInfo.name)}`,
                initials: getInitials(userInfo.name),
                role: 'admin',
                activeRole: 'admin',
            }
            const userDataRef = ref(db, user.uid + '/userData');
            update(userDataRef, userData);
        })
        .catch((error) => {
            const errorCode = error.code;
            if(errorCode === 'auth/email-already-in-use'){
                setLoginError(t('register.emailInUse'));
            }
        })
    };

    return (
        <div className="flex flex-col gap-2 sm:gap-0.5 md:m-auto">
            <h2 className="text-lg text-slate-900 dark:text-slate-100">{t('register.title')}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-1 md:w-full md:justify-center">
                <TextField
                    id="filled-basic" 
                    label={t('register.name')} 
                    variant="filled" 
                    name="name"
                    data-testid='cypress-registername'
                    size="small"
                    value={userInfo.name}
                    onChange={handleChange}
                    error={formErrors?.name ? true : false}
                    helperText={formErrors?.name}
                    sx={props.inputStyles}
                />
                <TextField
                    id="filled-basic" 
                    label={t('register.email')}
                    variant="filled"
                    name="email"
                    data-testid='cypress-registeremail'
                    size="small"
                    value={userInfo.email}
                    onChange={handleChange}
                    error={formErrors?.email ? true : false}
                    helperText={formErrors?.email}
                    sx={props.inputStyles}
                />
                <TextField
                    id="filled-basic" 
                    label={t('register.password')} 
                    variant="filled"
                    data-testid='cypress-registerpassword'
                    size="small"
                    name="password"
                    value={userInfo.password}
                    onChange={handleChange}
                    error={formErrors?.password ? true : false}
                    helperText={formErrors?.password}
                    sx={props.inputStyles}
                />
                <Button type="submit" 
                    sx={props.buttonStyles}
                    data-testid='cypress-register'
                >{t('register.register')}</Button>
                {loginError && 
                    <div className="text-rose-600 flex gap-2 items-center justify-center">
                        <ErrorIcon sx={{ color:'red', fontSize: 20 }}/>
                        {loginError}
                    </div>}
            </form>
        </div>
            
    );
}

export default Register;
