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

const steps = ['Enter Amount to Stake', 'Submit'];

export default function StakeStepper(props) {

  const [activeStep, setActiveStep] = React.useState(0);
  const [isNextLoading, setNextLoading] = React.useState(false);

  const [amountTransactable, setAmountTransactable] = React.useState(0);
  const [amountTransactableBN, setAmountTransactableBN] = React.useState(new BigNumber2RD(0));
  const [amountTransactableWorth, setAmountTransactableWorth] = React.useState(0);

  const [inputAmount, setInputAmount] = React.useState(null);
  const [inputAmountBN, setInputAmountBN] = React.useState(new BigNumber2RD(0));
  const [inputAmountWorth, setInputAmountWorth] = React.useState(null);

  const [txReceipt, setTxReceipt] = React.useState(null);
  const [txError, setTxError] = React.useState(null);
  const [outcomeAmount, setOutcomeAmount] = React.useState(null);

  useEffect(() => {
    const { isLoggedIn, walletAddress, bankContract, tokenDecimals } = props.data;
    if (!isLoggedIn || !bankContract) {
      return;
    }

    try {
      bankContract.methods.unlockedSharesOf(walletAddress).call((error, unlockedSharesRaw) => {
        if (error) {
          return;
        }
        const amountTransactable = converter.tokenToDisplayValue(unlockedSharesRaw, tokenDecimals, 2);

        setAmountTransactable(amountTransactable);
        setAmountTransactableBN(new BigNumber2RD(amountTransactable.replaceAll(',', '')));

        const amountTransactableTokenVal = converter.displayToTokenValue(amountTransactable, tokenDecimals);
        bankContract.methods.sharesToTokens(amountTransactableTokenVal).call((error, amountTransactableWorthRaw) => {
          if (error) {
            return;
          }
          setAmountTransactableWorth(converter.tokenToDisplayValue(amountTransactableWorthRaw, tokenDecimals, 2));
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
      case 1: estimateInputWorth(); break;
      case 2: submit(); break;
      default: setNextLoading(false);
    }
  };

  const estimateInputWorth = async () => {
    const { bankContract, tokenDecimals } = props.data;

    try {
      const shareAmount = converter.displayToTokenValue(inputAmount, tokenDecimals);
      await bankContract.methods.sharesToTokens(shareAmount).call((error, tokens) => {
        if (!error) {
          setInputAmountWorth(converter.tokenToDisplayValue(tokens, tokenDecimals, 2));
        }
      });
    } catch (error) {
      console.log(error);
    }

    setNextLoading(false);
  }

  const submit = async () => {
    const { walletAddress, bankContract, tokenDecimals } = props.data;

    try {
      const shareAmount = converter.displayToTokenValue(inputAmount, tokenDecimals);
      await bankContract.methods.stake(shareAmount)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setTxReceipt(receipt);
          setNextLoading(false);

          if (receipt.status && receipt.status === true) {
            setOutcomeAmount(inputAmount);
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
                      Stake Shares Request Submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      {outcomeAmount && <GridRow label="Amount staked" value={outcomeAmount + " Pool Shares"} lcWidth="3" rcWidth="9" />}
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
                      label="Stake Amount"
                      variant="standard"
                      value={inputAmount}
                      onChange={handleAmountInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">Pool Shares</InputAdornment>,
                        inputComponent: NumberFormatCustom,
                      }}
                    />
                    <Typography sx={{ mt: 0.5, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Stakeable {amountTransactable} Pool Shares
                    </Typography>
                    <Typography sx={{ mt: 0.2, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Estimated token value {amountTransactableWorth} {props.data.tokenSymbol}
                    </Typography>
                  </>,
                "1":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Stake {inputAmount} Pool Shares
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Shares" value={inputAmount} lcWidth="3" rcWidth="9" />
                      <GridRow label="Estimated token value" value={inputAmountWorth + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
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
              disabled={isNextLoading || (activeStep === 0 && (inputAmountBN.comparedTo(0) === 0 || inputAmountBN.comparedTo(amountTransactableBN) > 0))}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
