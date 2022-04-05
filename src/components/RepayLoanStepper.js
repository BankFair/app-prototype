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

const NumberFormatCustom = React.forwardRef(function NumberFormatCustom(props, ref) {
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

const steps = ['Enter Payment Amount', 'Approve Spend Limit', 'Submit Payment'];

export default function RepayLoanStepper(props) {

  const [activeStep, setActiveStep] = React.useState(0);
  const [isNextLoading, setNextLoading] = React.useState(false);

  const [txReceipt, setTxReceipt] = React.useState(null);
  const [txError, setTxError] = React.useState(null);

  const [spendingLimitReceipt, setSpendingLimitReceipt] = React.useState(null);
  const [spendingLimitTxError, setSpendingLimitTxError] = React.useState(null);

  const [walletBalance, setWalletBalance] = React.useState(0);
  const [walletBalanceBN, setWalletBalanceBN] = React.useState(new BigNumber2RD(0));
  const [dueAmount, setDueAmount] = React.useState(0);
  const [dueAmountBN, setDueAmountBN] = React.useState(new BigNumber2RD(0));
  const [depositAmount, setDepositAmount] = React.useState(null);
  const [depositAmountBN, setDepositAmountBN] = React.useState(new BigNumber2RD(0));

  const [amountPaid, setAmountPaid] = React.useState(null);
  // const [baseAmountPaid, setBaseAmountPaid] = React.useState(null);
  // const [interestPaid, setInterestPaid] = React.useState(null);

  useEffect(() => {
    const { isLoggedIn, walletAddress, bankContract, tokenContract, tokenDecimals } = props.data;
    if (!isLoggedIn || !tokenContract || !bankContract) {
      return;
    }

    tokenContract.methods.balanceOf(walletAddress).call((error, value) => {
      if (error) {
        return;
      }
      let walletBalance = converter.tokenToDisplayValue(value, tokenDecimals, 2);
      setWalletBalance(walletBalance);
      setWalletBalanceBN(new BigNumber2RD(walletBalance.replaceAll(',', '')));
    });

    bankContract.methods.loanBalanceDueToday(props.loanId).call((error, value) => {
      if (error) {
        return;
      }
      let dueAmount = converter.tokenToDisplayValue(value, tokenDecimals, 2);
      setDueAmount(dueAmount);
      setDueAmountBN(new BigNumber2RD(dueAmount.replaceAll(',', '')));
    });

  }, [props.data, props.loanId]);

  const handleNext = () => {
    setNextLoading(true);

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);

    switch (nextStep) {
      case 1: approveDepositSpendingLimit(nextStep); break;
      case 3: repayLoan(nextStep); break;
      default: setNextLoading(false);
    }
  };

  const approveDepositSpendingLimit = async (nextStep) => {
    const { walletAddress, bankContractAddress, tokenContract, tokenDecimals } = props.data;

    try {
      const tokenAmount = converter.displayToTokenValue(depositAmount, tokenDecimals);
      tokenContract.methods.approve(bankContractAddress, tokenAmount)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setSpendingLimitReceipt(receipt);
          setNextLoading(false);
        })
        .on('error', function (error, receipt) {
          setSpendingLimitTxError(error?.message);
          setActiveStep(nextStep - 1);
          setNextLoading(false);
        });

    } catch (error) {
      console.log(error);
      setActiveStep(nextStep - 1);
      setNextLoading(false);
    }
  }

  const repayLoan = async (nextStep) => {
    const { walletAddress, bankContract, tokenDecimals } = props.data;

    try {
      const tokenAmount = converter.displayToTokenValue(depositAmount, tokenDecimals);
      await bankContract.methods.repayLoan(props.loanId, tokenAmount)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setTxReceipt(receipt);
          setNextLoading(false);

          if (receipt.status && receipt.status === true && receipt.events && receipt.events[0]) {
            const txAmountPaid = converter.tokenToDisplayValue(receipt.events[0].raw.data, tokenDecimals, 2);
            // const txInterestPaid = converter.tokenToDisplayValue(receipt.events[1].raw.data, tokenDecimals, 2);
            // const txBaseAmountPaid = new BigNumber2RD(txAmountPaid.replaceAll(',', ''))
            //   .minus(new BigNumber2RD(txInterestPaid.replaceAll(',', ''))).toFormat(2);

            setAmountPaid(txAmountPaid);
            // setBaseAmountPaid(txBaseAmountPaid);
            // setInterestPaid(txInterestPaid);
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
      } else {
        setActiveStep(nextStep - 1);
      }
      setNextLoading(false);
    }
  }

  const handleAmountInput = (event) => {
    setDepositAmount(event.target.value);
    setDepositAmountBN(new BigNumber2RD(event.target.value));
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
                      Payment Submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Amount Paid" value={amountPaid + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      {/* <GridRow label="Base Amount" value={baseAmountPaid + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      <GridRow label="Interest" value={interestPaid + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" /> */}

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
                      label="Payment Amount"
                      variant="standard"
                      value={depositAmount}
                      onChange={handleAmountInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{props.data.tokenSymbol}</InputAdornment>,
                        inputComponent: NumberFormatCustom,
                      }}
                    />
                    <Typography sx={{ mt: 2, mb: 0, ml: 'auto' }} color="text.secondary">
                      Amount due with interest {dueAmount} {props.data.tokenSymbol}
                    </Typography>
                    <Typography sx={{ mt: 1, mb: 1, ml: 'auto' }} color="text.secondary">
                      Available {walletBalance} {props.data.tokenSymbol}
                    </Typography>
                  </>,
                "1":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Approve a spend limit to pay {depositAmount} {props.data.tokenSymbol}
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Spender" value={props.data.bankContractAddress} lcWidth="3" rcWidth="9" />
                      <GridRow label="Amount" value={depositAmount + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      <Grid item xs={3}>
                        <Typography>Transaction</Typography>
                      </Grid>
                      <Grid item xs={9}>
                        {
                          spendingLimitReceipt
                            ? <Link href={"https://kovan.etherscan.io/tx/" + spendingLimitReceipt.transactionHash} target="_blank">
                              View on Etherscan
                            </Link>
                            : <Typography color="text.secondary">loading...</Typography>
                        }
                      </Grid>
                    </Grid>
                  </>,
                "2":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Repay {depositAmount} {props.data.tokenSymbol}
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Loan Id" value={props.loanId} lcWidth="3" rcWidth="9" />
                      <GridRow label="Repay Amount" value={depositAmount + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
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
              disabled={isNextLoading || (activeStep === 0 && (depositAmountBN.comparedTo(0) === 0
                || depositAmountBN.comparedTo(walletBalanceBN) > 0 || depositAmountBN.comparedTo(dueAmountBN) > 0))}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
