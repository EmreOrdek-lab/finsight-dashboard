import React from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

function EditDialogBox(props) {
    return (
        <div>
            <Dialog
                open={props.dialogBoxOn}
                onClose={props.toSetDialogBoxOff}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
                PaperProps={{
                    sx: {
                        backgroundColor: props.theme === 'dark' ? '#18181b' : '#ffffff',
                        color: props.theme === 'dark' ? '#f8fafc' : '#0f172a',
                        border: `1px solid ${props.theme === 'dark' ? 'rgba(113, 113, 122, 0.28)' : 'rgba(148, 163, 184, 0.28)'}`,
                        borderRadius: 3,
                        minWidth: {
                            xs: 'calc(100vw - 32px)',
                            sm: 460,
                        },
                    },
                }}>
                <DialogTitle 
                    id="alert-dialog-title">
                    {props.dialogTitle}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText 
                        id="alert-dialog-description"
                        sx={{ color: props.theme === 'dark' ? '#a1a1aa' : '#475569' }}>
                        {props.dialogText}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button 
                        sx={props.buttonStyles} 
                        onClick={props.toSetDialogBoxOff}
                        data-testid='dialogContinue'>Continue editing</Button>
                    <Button 
                        sx={props.buttonStyles} 
                        onClick={props.toSetDialogBoxOffAndClearGoal}
                        data-testid='dialogExit'>
                        Exit anyway
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}

export default EditDialogBox;