import React from 'react';
import {
  Box,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  CircularProgress,
  Link,
} from '@mui/material';
import GridRow from "./GridRow";

const steps = ['Withdraw Loan Funds'];

export default function TakeLoanStepper(props) {

  const [activeStep, setActiveStep] = React.useState(0);
  const [isNextLoading, setNextLoading] = React.useState(false);

  const [txReceipt, setTxReceipt] = React.useState(null);
  const [txError, setTxError] = React.useState(null);
  const [loanId, setLoanId] = React.useState(null);

  const handleNext = () => {
    setNextLoading(true);

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);

    switch (nextStep) {
      case 1: submit(); break;
      default: setNextLoading(false);
    }
  };

  const submit = async () => {
    const { walletAddress, bankContract } = props.data;

    try {

      await bankContract.methods.withdrawLoanFunds(props.loanApplication.id)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setTxReceipt(receipt);
          setNextLoading(false);
          console.log(receipt);

          if (receipt.status && receipt.status === true) {
            setLoanId(props.loanApplication.id);
          }
        })
        .on('error', function (error, receipt) {
          setTxError(error?.message);
          setNextLoading(false);
        });
    } catch (error) {
      console.log(error);
      if (error.message) {
        setTxError(error?.message);
      }
      setNextLoading(false);
    }
  }

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label, index) => {
          const stepProps = {};
          const labelProps = {};
          return (
            <Step key={label} {...stepProps}>
              <StepLabel {...labelProps}>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      {activeStep === steps.length ? (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left', minHeight: '8rem' }}>
            {
              txError
                ?
                <Typography sx={{ mt: 10, mb: 1, alignSelf: 'center' }} color='error'>
                  {txError}
                </Typography>
                : isNextLoading
                  ?
                  <CircularProgress sx={{ mt: 2, mb: 2, alignSelf: 'center' }} />
                  : txReceipt && <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} >
                      Withdraw loan funds request submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      {loanId &&
                        <>
                          <GridRow label="Loan ID: " value={loanId} lcWidth="3" rcWidth="9" />
                          <GridRow label="Amount" value={props.loanApplication.amount + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                        </>
                      }
                      <Grid item xs={3}>
                        <Typography>Transaction</Typography>
                      </Grid>
                      <Grid item xs={9}>
                        <Link href={"https://kovan.etherscan.io/tx/" + txReceipt.transactionHash} target="_blank">
                          View on Etherscan
                        </Link>
                      </Grid>
                    </Grid>
                  </>
            }
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mb: '0' }}>
            <Box sx={{ flex: '1 1 auto' }} />
            <Button onClick={props.closeHandler}>Close</Button>
          </Box>
        </>
      ) : (
        <>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left', minHeight: '8rem' }}>
            {
              {

                "0":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }}>
                      Take this loan, and withdraw {props.loanApplication.amount + " " + props.data.tokenSymbol}?
                    </Typography>
                    <Grid>
                      <Grid container spacing={0} sx={{ ml: 2, }}>
                        <GridRow label="Loan ID " value={props.loanApplication.id} lcWidth="6" rcWidth="6" />
                        <GridRow label="Status" value={props.loanApplication.status} lcWidth="6" rcWidth="6" />
                        <GridRow label="Borrower" value={props.loanApplication.borrower} lcWidth="6" rcWidth="6" />
                        <GridRow label="Amount" value={props.loanApplication.amount + " " + props.data.tokenSymbol} lcWidth="6" rcWidth="6" />
                        <GridRow label="Duration" value={props.loanApplication.duration + " day(s)"} lcWidth="6" rcWidth="6" />
                        <GridRow label="APR" value={props.loanApplication.apr + "%"} lcWidth="6" rcWidth="6" />
                        <GridRow label="Late payment APR delta" value={props.loanApplication.lateAPR + "%"} lcWidth="6" rcWidth="6" />
                        <GridRow label="Applied time" value={props.loanApplication.appliedTime} lcWidth="6" rcWidth="6" />
                        <GridRow label="Approved time" value={props.loanDetail.approvedTime} lcWidth="6" rcWidth="6" />
                      </Grid>
                    </Grid>
                  </>
              }[activeStep]
            }
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mb: '0' }}>
            <Button
              color="error"
              onClick={props.closeHandler}
              sx={{ mr: 1 }}
            >
              Cancel
            </Button>
            <Box sx={{ flex: '1 1 auto' }} />

            <Button onClick={handleNext}
              disabled={isNextLoading || (activeStep === 0 && props.loanApplication.status !== 'APPROVED')}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Withdraw Funds' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
