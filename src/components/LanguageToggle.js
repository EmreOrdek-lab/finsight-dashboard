import React from 'react';
import Button from '@mui/material/Button';
import { useLanguage } from '../context/LanguageContext';

function LanguageToggle(props) {
    const { language, setLanguage, t } = useLanguage();

    return (
        <div className={`flex items-center gap-2 ${props.className || ''}`.trim()}>
            {!props.hideLabel && (
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-zinc-500">
                    {t('common.language')}
                </span>
            )}
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/80 p-1 dark:border-zinc-800 dark:bg-zinc-900/80">
                <Button
                    size="small"
                    variant={language === 'tr' ? 'contained' : 'text'}
                    onClick={() => setLanguage('tr')}
                    sx={props.buttonStyles}>
                    TR
                </Button>
                <Button
                    size="small"
                    variant={language === 'en' ? 'contained' : 'text'}
                    onClick={() => setLanguage('en')}
                    sx={props.buttonStyles}>
                    EN
                </Button>
            </div>
        </div>
    );
}

export default LanguageToggle;
