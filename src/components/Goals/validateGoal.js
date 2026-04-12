function validateGoal(values, t = (key) => key) {
    const errors = {}; 
    if(!values.name || values.name.trim().length === 0){
        errors.name = t('goals.validation.nameRequired');
    }
    if(values.name.length > 12){
        errors.name = t('goals.validation.maxLength');
    }


    if(isNaN(values.total)){
        errors.total = t('goals.validation.totalNumber');
    }
    if(values.total <= 0){
        errors.total = t('goals.validation.totalPositive');
    }
    if(!values.total){
        errors.total = t('goals.validation.totalRequired');
    }
    if(values.total > 9999999.99){
        errors.total = t('goals.validation.totalMax');
    }


    if(isNaN(values.current)){
        errors.current = t('goals.validation.currentNumber');
    }
    if(parseFloat(values.current) > parseFloat(values.total)){
        errors.current = t('goals.validation.currentHigherThanTotal');
        errors.total = t('goals.validation.totalLowerThanCurrent');
    }
    if(!values.current){
        errors.current = t('goals.validation.currentRequired');
    }
    if(values.current < 0){
        errors.current = t('goals.validation.currentPositive');
    }
    if(values.current > 9999999.99){
        errors.current = t('goals.validation.currentMax');
    }

    return errors;
}

export default validateGoal;
