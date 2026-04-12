import React from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useLanguage } from '../../context/LanguageContext';
import { formatMoney } from '../../utils/formatters';

function SpendingAccordion(props) {
  const { locale } = useLanguage();

  // handles which accordion is active (or expanded)
  const handleChange = (index) => (e, newExpanded) => {
    props.toSetCurrentCategory(newExpanded ? index : false);
  }

  let colors = ['#0f766e', '#1d4ed8', '#475569', '#b45309', '#7c2d12', '#334155'];

  let accordionStyles = {
    backgroundColor: props.theme === 'dark' ? '#18181b' : '#f8fafc',
    margin: '3px auto',
    borderRadius: 8,
    padding: 0,
    boxShadow: "none",
    color: props.theme === 'dark' ? '#f8fafc' : '#0f172a',
    border: `1px solid ${props.theme === 'dark' ? 'rgba(113,113,122,0.24)' : 'rgba(148,163,184,0.24)'}`
  }

  return(
      props.formattedTransactions.map((value, index) => {
        return(
            <Accordion key={index} 
              expanded={props.currentCategory === index} 
              onChange={handleChange(index)}
              sx={accordionStyles}
              data-testid="spendingAccordion"
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon sx={{ color: '#f8fafc' }} />}
                aria-controls="panel1a-content"
                id="panel1a-header"
                sx={{
                  backgroundColor: `${colors[index]}`,
                  borderRadius: 1,
                  margin: 'auto',
                  display: 'flex',
                  justifyContent: 'space-between',
                  boxShadow: "none",
                  minHeight: 0,
                  height: '35px',
                  "&.Mui-expanded": {
                    minHeight: 0
                  },
                  "& .MuiAccordionSummary-content.Mui-expanded": {
                    margin: "10px 0"
                  }
                  }}
                >
                <Typography
                  data-testid={`spendingAccordionBar${index}`}
                  sx={{
                    padding: '0px',
                    margin: '0px',
                    fontSize: '15px', 
                    fontWeight: 600,
                    flexBasis: '90%',
                  }}>
                  {value.name}
                </Typography>
                <Typography
                  sx={{
                    padding: '0px',
                    margin: '0px',
                    fontSize: '15px',
                    fontWeight: 600,
                    justifySelf: 'flex-end',
                  }}>
                  {formatMoney(value.value, 'USD', locale)}
                </Typography>
              </AccordionSummary>
              <AccordionDetails 
                sx={{overflowY: 'auto', margin: 'auto'}}>
                {props.allTransactions
                  .filter((transaction) => transaction.category === value.name)
                  .map((filteredTransaction, index) => {
                    return(
                      <div className="m-auto flex w-8/12 justify-between text-slate-900 dark:text-slate-100 sm:w-9/12 sm:m-auto" key={index}>
                        <Typography
                          data-testid={`spendingAccordionTypographyName${index}`}
                          sx={{textAlign:"left", flexBasis: '50%'}}>{filteredTransaction.name}</Typography>
                        <Typography
                          data-testid={`spendingAccordionTypographyMoney${index}`}
                          sx={{textAlign:"right", flexBasis: '50%'}}>{formatMoney(filteredTransaction.value, 'USD', locale)}</Typography>
                      </div>
                    )
                  })
                }
              </AccordionDetails>
            </Accordion>
        ); 
      })
    )
}

export default SpendingAccordion;
