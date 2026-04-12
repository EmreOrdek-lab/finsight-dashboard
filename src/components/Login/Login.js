import React, { useState } from 'react';
import { auth } from '../../config/Firebase';
import { signInWithEmailAndPassword } from "firebase/auth";
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import ErrorIcon from '@mui/icons-material/Error';
import { useLanguage } from '../../context/LanguageContext';

function Login(props) {
    const { t } = useLanguage();
    const initialUserInfo ={ email: "", password: "" };
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
        // follows email format
        if( !values.email.includes('@') || !values.email.includes('.')){
            errors.email = t('login.mustBeValidEmail');
        }
        if(!values.email){
            errors.email = t('login.emailRequired');
        }

        if(!values.password){
            errors.password = t('login.passwordRequired');
        }
        return errors;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        const errors = validate(userInfo);
        setFormErrors(errors);
        setLoginError(null);

        if(Object.keys(errors).length === 0){
            loginFirebase();
        }
    }

    const loginFirebase = () => {
        signInWithEmailAndPassword(auth, userInfo.email, userInfo.password)
        .then(() => {
            setFormErrors({});
            setUserInfo(initialUserInfo);
        })      
        .catch((error) => {
            const errorCode = error.code;
            if(errorCode === 'auth/user-not-found'){
                setLoginError(t('login.emailNotRegistered'));
            } else if (errorCode === 'auth/wrong-password'){
                setLoginError(t('login.incorrectPassword'));
            }
        });
    };

    return (
        <div className="flex flex-col gap-2 sm:gap-1 md:m-auto">
            <h2 className="text-lg text-slate-900 dark:text-slate-100">{t('login.signIn')}</h2>
            <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:gap-1 md:w-full md:justify-center">
                <TextField
                    id="filled-basic" 
                    label={t('login.email')}
                    variant="filled"
                    data-testid='cypress-email'
                    name="email"
                    size="small"
                    value={userInfo.email}
                    onChange={handleChange}
                    error={formErrors?.email ? true : false}
                    helperText={formErrors?.email}
                    sx={props.inputStyles}
                />
                <TextField
                    id="filled-basic" 
                    label={t('login.password')} 
                    variant="filled"
                    data-testid='cypress-password'
                    size="small"
                    name="password"
                    value={userInfo.password}
                    onChange={handleChange}
                    error={formErrors?.password ? true : false}
                    helperText={formErrors?.password}
                    sx={props.inputStyles}
                />
                <Button type="submit" sx={props.buttonStyles}>{t('login.login')}</Button>
                {loginError && 
                    <div className="text-rose-600 flex gap-2 items-center justify-center">
                        <ErrorIcon sx={{ color:'red', fontSize: 20 }}/>
                        {loginError}
                    </div>}
            </form>
        </div>
    );
}

export default Login;
