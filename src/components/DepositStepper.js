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

const steps = ['Enter Deposit Amount', 'Approve Spend Limit', 'Submit Deposit'];

export default function DepositStepper(props) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [walletBalance, setWalletBalance] = React.useState(0);
  const [walletBalanceBN, setWalletBalanceBN] = React.useState(new BigNumber2RD(0));
  const [depositAmount, setDepositAmount] = React.useState(null);
  const [depositAmountBN, setDepositAmountBN] = React.useState(new BigNumber2RD(0));
  const [estimatedShares, setEstimatedShares] = React.useState(null);
  const [isNextLoading, setNextLoading] = React.useState(false);
  const [spendingLimitReceipt, setSpendingLimitReceipt] = React.useState(null);
  const [spendingLimitTxError, setSpendingLimitTxError] = React.useState(null);
  const [depositReceipt, setDepositReceipt] = React.useState(null);
  const [depositTxError, setDepositTxError] = React.useState(null);


  useEffect(() => {
    const { isLoggedIn, walletAddress, tokenContract, tokenDecimals } = props.data;
    if (!isLoggedIn || !tokenContract) {
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
  }, [props.data]);

  const handleNext = () => {
    setNextLoading(true);

    const nextStep = activeStep + 1;
    setActiveStep(nextStep);

    switch (nextStep) {
      case 1: approveDepositSpendingLimit(nextStep); break;
      case 2: estimateShares(); break;
      case 3: submitDeposit(nextStep); break;
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

  const estimateShares = async () => {
    const { bankContract, tokenDecimals } = props.data;

    try {
      const tokenAmount = converter.displayToTokenValue(depositAmount, tokenDecimals);
      await bankContract.methods.tokensToShares(tokenAmount).call((error, shares) => {
        if (!error) {
          setEstimatedShares(converter.tokenToDisplayValue(shares, tokenDecimals, 2));
        }
      });
    } catch (error) {
      console.log(error);
    }

    setNextLoading(false);
  }

  const submitDeposit = async (nextStep) => {
    const { walletAddress, bankContract, tokenDecimals } = props.data;

    try {
      const tokenAmount = converter.displayToTokenValue(depositAmount, tokenDecimals);
      await bankContract.methods.enterPool(tokenAmount)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setDepositReceipt(receipt);
          setNextLoading(false);
        })
        .on('error', function (error, receipt) {
          setDepositTxError(error?.message);
          setNextLoading(false);
        });
    } catch (error) {
      console.log(error);
      if (error.message) {
        setDepositTxError(error?.message);
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
              depositTxError
                ?
                <Typography sx={{ mt: 10, mb: 1, alignSelf: 'center' }} color='error'>
                  {depositTxError}
                </Typography>
                : isNextLoading
                  ?
                  <CircularProgress sx={{ mt: 2, mb: 2, alignSelf: 'center' }} />
                  : depositReceipt && <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} >
                      Deposit Submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Amount Deposited" value={depositAmount + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      <Grid item xs={3}>
                        <Typography>Transaction</Typography>
                      </Grid>
                      <Grid item xs={9}>
                        <Link href={"https://kovan.etherscan.io/tx/" + depositReceipt.transactionHash} target="_blank">
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
                      label="Deposit Amount"
                      variant="standard"
                      value={depositAmount}
                      onChange={handleAmountInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">{props.data.tokenSymbol}</InputAdornment>,
                        inputComponent: NumberFormatCustom,
                      }}
                    />
                    <Typography sx={{ mt: 2, mb: 1, ml: 'auto' }} color="text.secondary">
                      Available {walletBalance} {props.data.tokenSymbol}
                    </Typography>
                  </>,
                "1":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Approve a spend limit to deposit {depositAmount} {props.data.tokenSymbol}
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
                      Deposit {depositAmount} {props.data.tokenSymbol}
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Token amount" value={depositAmount + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      <GridRow label="Estimated shares to be received" value={estimatedShares} lcWidth="3" rcWidth="9" />
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
              disabled={isNextLoading || (activeStep === 0 && (depositAmountBN.comparedTo(0) === 0 || depositAmountBN.comparedTo(walletBalanceBN) > 0))}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
