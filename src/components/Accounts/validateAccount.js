function validateAccount(values, otherAccounts, t = (key) => key) {
    const errors = {}; 

    let accountNames = [];
    Object.values(otherAccounts).forEach((account) => {
        accountNames.push(account.name);
    })
    if(accountNames.includes(values.name)){
        errors.name = t('accounts.validation.unique');
    }
    if(!values.name || values.name.trim().length === 0){
        errors.name = t('accounts.validation.nameRequired');
    }
    if(values.name.length > 12){
        errors.name = t('accounts.validation.maxLength');
    }

    if(values.debit === undefined){
        errors.debit = t('accounts.validation.typeRequired');
    }
    return errors;
}

export default validateAccount;
