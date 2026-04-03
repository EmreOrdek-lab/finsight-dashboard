import React, { forwardRef } from 'react';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import MuiAlert from '@mui/material/Alert';

const Alert = forwardRef(function Alert(props, ref) {
    return <MuiAlert elevation={0} ref={ref} variant="outlined" {...props} />;
  });

function ErrorSnackbar(props) {
    return (
            <Box sx={{ width: { xs: 'calc(100vw - 32px)', sm: 420 }, maxWidth: '100%' }}>
                <Snackbar
                    autoHideDuration={2500}
                    anchorOrigin={{ vertical:'top', horizontal:'center' }}
                    open={props.errorSnackbarOn}
                    onClose={props.toSetErrorSnackbarOff}>
                    <Alert 
                        onClose={props.toSetErrorSnackbarOff} 
                        severity="error" 
                        sx={{ width: '100%', backgroundColor: 'background.paper', borderColor: 'divider' }}>
                        {props.message}
                    </Alert>
                </Snackbar>
            </Box>
    );
}

export default ErrorSnackbar;