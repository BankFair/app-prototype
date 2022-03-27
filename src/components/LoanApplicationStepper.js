import React, { useEffect } from 'react';
import NumberFormat from 'react-number-format';
import {
  Box,
  Grid,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Link,
} from '@mui/material';
import GridRow from "./GridRow";
import converter, { BigNumber2RD } from "../util/converter";

const NumberFormatCustomDecimal = React.forwardRef(function NumberFormatCustom(props, ref) {
  const { onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={ref}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      thousandSeparator
      isNumericString
      allowNegative={false}
      decimalScale={2}
    />
  );
});

const NumberFormatCustomInt = React.forwardRef(function NumberFormatCustom(props, ref) {
  const { onChange, ...other } = props;

  return (
    <NumberFormat
      {...other}
      getInputRef={ref}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      allowNegative={false}
      decimalScale={0}
    />
  );
});

const steps = ['Enter Details', 'Review and Submit'];

const DAY_SECONDS = 86400;

export default function LoanApplicationStepper(props) {

  const [activeStep, setActiveStep] = React.useState(0);
  const [isNextLoading, setNextLoading] = React.useState(false);

  const [txReceipt, setTxReceipt] = React.useState(null);
  const [txError, setTxError] = React.useState(null);
  const [loanId, setLoanId] = React.useState(null);

  const [limits, setLimits] = React.useState({
    minAmount: null,
    minAmountBN: new BigNumber2RD(0),
    minDuration: 0,
    maxDuration: 0,
  });

  const [inputAmount, setInputAmount] = React.useState(null);
  const [inputAmountBN, setInputAmountBN] = React.useState(new BigNumber2RD(0));

  const [inputDuration, setInputDuration] = React.useState(null);

  useEffect(() => {
    const { bankContract, tokenDecimals } = props.data;
    if (!bankContract) {
      return;
    }

    try {
      bankContract.methods.minAmount().call((error, minAmountRaw) => {
        if (error) {
          return;
        }
        bankContract.methods.minDuration().call((error, minDurationRaw) => {
          if (error) {
            return;
          }
          bankContract.methods.maxDuration().call((error, maxDurationRaw) => {
            if (error) {
              return;
            }
            const minAmount = converter.tokenToDisplayValue(minAmountRaw, tokenDecimals, 2);
            const minAmountBN = new BigNumber2RD(minAmount.replaceAll(',', ''));
            const minDuration = parseInt(minDurationRaw) / DAY_SECONDS;
            const maxDuration = parseInt(maxDurationRaw) / DAY_SECONDS;

            setLimits({
                minAmount: minAmount,
                minAmountBN: minAmountBN,
                minDuration: minDuration,
                maxDuration: maxDuration,
            });
          });
        });
      });
    } catch (error) {
      console.log(error);
    }
  }, [props.data]);

  const handleNext = () => {
    setNextLoading(true);

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);

    switch (nextStep) {
      // case 1: estimateLoanInterestAmount(); break; // TODO estimate amount due by the loan end date
      case 2: submit(); break;
      default: setNextLoading(false);
    }
  };

  const submit = async () => {
    const { walletAddress, bankContract, tokenDecimals } = props.data;

    try {
      const borrowAmount = converter.displayToTokenValue(inputAmount, tokenDecimals);
      const durationSeconds = inputDuration * DAY_SECONDS;

      await bankContract.methods.applyForLoan(borrowAmount, durationSeconds)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setTxReceipt(receipt);
          setNextLoading(false);
          console.log(receipt);

          if (receipt.status && receipt.status === true && receipt.events && receipt.events[0]) {
            setLoanId(new BigNumber2RD(receipt.events[0].raw.data).integerValue().toString(10));
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

  const handleAmountInput = (event) => {
    setInputAmount(event.target.value);
    setInputAmountBN(new BigNumber2RD(event.target.value));
  };

  const handleDurationInput = (event) => {
    setInputDuration(parseInt(event.target.value));
  };

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
                      Loan Application Submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      {<GridRow label="Loan ID: " value={loanId} lcWidth="3" rcWidth="9" />}
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
                    <TextField sx={{ mt: 2, mb: 1, input: { textAlign: "right" } }}
                      label="Loan Amount"
                      variant="standard"
                      value={inputAmount}
                      onChange={handleAmountInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{props.data.tokenSymbol}</InputAdornment>,
                        inputComponent: NumberFormatCustomDecimal,
                      }}
                    />
                    <Typography sx={{ mt: 0.5, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Min amount {limits.minAmount} {props.data.tokenSymbol}
                    </Typography>

                    <TextField sx={{ mt: 2, mb: 1, input: { textAlign: "right" } }}
                      label="Loan Duration"
                      variant="standard"
                      value={inputDuration}
                      onChange={handleDurationInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">day(s)</InputAdornment>,
                      }}
                    />
                    <Typography sx={{ mt: 0.5, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Min duration {limits.minDuration} day(s)
                    </Typography>
                    <Typography sx={{ mt: 0.2, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Max duration {limits.maxDuration} day(s)
                    </Typography>
                  </>,
                "1":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Loan Application
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Borrower" value={props.data.walletAddress} lcWidth="4" rcWidth="8" />
                      <GridRow label="Amount" value={inputAmount + " " + props.data.tokenSymbol} lcWidth="4" rcWidth="8" />
                      <GridRow label="Duration" value={inputDuration + " " + "day(s)"} lcWidth="4" rcWidth="8" />
                      <GridRow label="APR" value={props.data.defaultAPR + "%"} lcWidth="4" rcWidth="8" />
                      <GridRow label="Late Payment APR Increase" value={props.data.defaultLateFeePercent + "%"} lcWidth="4" rcWidth="8" />
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
              disabled={isNextLoading || (activeStep === 0 && (inputAmountBN.comparedTo(0) === 0 || inputAmountBN.comparedTo(limits.minAmountBN) < 0 
              || inputDuration === null || inputDuration === 0 || inputDuration < limits.minDuration || inputDuration > limits.maxDuration))}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
