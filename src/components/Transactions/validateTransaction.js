function validateTransaction(values, CCTotal, t = (key, params) => key) {
    let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let currentMonth = monthDays[new Date().getMonth()];

    const errors = {};

    if(values.name.length > 10){
        errors.name = t('transactions.validation.titleMax');
    }
    if(!values.name || values.name.trim().length === 0){
        errors.name = t('transactions.validation.titleRequired');
    }

    if(!values.account){
        errors.account = t('transactions.validation.accountRequired');
    }

    if(!values.category){
        errors.category = t('transactions.validation.categoryRequired');
    }

    if( isNaN(values.date) || values.date < 1 || values.date > currentMonth || values.date % 1 === '1'){
        errors.date = t('transactions.validation.dateRange', { day: currentMonth });
    }
    if(!values.date){
        errors.date = t('transactions.validation.dateRequired');
    }

    if(CCTotal && (parseFloat(values.value) > ( -1 * parseFloat(CCTotal)))){
        errors.value = t('transactions.validation.paymentTooLarge');
    }
    if( values.value > 9999999.99){
        errors.value = t('transactions.validation.valueMax');
    }
    if(isNaN(values.value)){
        errors.value = t('transactions.validation.valueNumber');
    }
    if(values.value <= 0){
        errors.value = t('transactions.validation.valuePositive');
    }
    if(!values.value){
        errors.value = t('transactions.validation.valueRequired');
    }

    if(values.category === 'Transfer' && typeof values.transferTo === 'object'){
        errors.transferTo = t('transactions.validation.transferRequired');
    }
    return errors;
}

export default validateTransaction;
