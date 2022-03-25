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
import BigNumber from 'bignumber.js';

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

const steps = ['Enter Withdrawal Amount', 'Request Withdrawal'];

export default function WithdrawalStepper(props) {
  const [activeStep, setActiveStep] = React.useState(0);
  const [isNextLoading, setNextLoading] = React.useState(false);

  const [unlockedShares, setUnlockedShares] = React.useState(0);
  const [poolLiqudity, setPoolLiqudity] = React.useState(0);
  const [sharesWithdrawable, setSharesWithdrawable] = React.useState(0);
  const [sharesWithdrawableBN, setSharesWithdrawableBN] = React.useState(new BigNumber2RD(0));
  const [sharesWithdrawableWorth, setSharesWithdrawableWorth] = React.useState(0);

  const [withdrawAmount, setWithdrawAmount] = React.useState(null);
  const [withdrawAmountBN, setWithdrawAmountBN] = React.useState(new BigNumber2RD(0));
  const [estimatedTokens, setEstimatedTokens] = React.useState(null);
  const [withdrawalReceipt, setWithdrawalReceipt] = React.useState(null);
  const [withdrawalTxError, setWithdrawalTxError] = React.useState(null);
  const [amountWithdrawn, setAmountWithdrawn] = React.useState(0);

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
        setUnlockedShares(converter.tokenToDisplayValue(unlockedSharesRaw, tokenDecimals, 2));
        bankContract.methods.sharesToTokens(unlockedSharesRaw).call((error, sharesWorthRaw) => {
          if (error) {
            return;
          }
          bankContract.methods.poolLiqudity().call((error, poolLiqudityRaw) => {
            if (error) {
              return;
            }
            setPoolLiqudity(converter.tokenToDisplayValue(poolLiqudityRaw, tokenDecimals, 2));
            bankContract.methods.tokensToShares(BigNumber.min(sharesWorthRaw, poolLiqudityRaw).integerValue().toString(10)).call((error, sharesWithdrawableRaw) => {
              if (error) {
                return;
              }

              const sharesWithdrawable = converter.tokenToDisplayValue(sharesWithdrawableRaw, tokenDecimals, 2);
              setSharesWithdrawable(sharesWithdrawable);
              setSharesWithdrawableBN(new BigNumber2RD(sharesWithdrawable.replaceAll(',', '')));

              const sharesWithdrawableTokenVal = converter.displayToTokenValue(sharesWithdrawable, tokenDecimals);

              bankContract.methods.sharesToTokens(sharesWithdrawableTokenVal).call((error, tokensWithdrawable) => {
                if (error) {
                  return;
                }
                setSharesWithdrawableWorth(converter.tokenToDisplayValue(tokensWithdrawable, tokenDecimals, 2));
              });
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
      case 1: estimateTokens(); break;
      case 2: submitWithdrawal(); break;
      default: setNextLoading(false);
    }
  };

  const estimateTokens = async () => {
    const { bankContract, tokenDecimals } = props.data;

    try {
      const shareAmount = converter.displayToTokenValue(withdrawAmount, tokenDecimals);
      await bankContract.methods.sharesToTokens(shareAmount).call((error, tokens) => {
        if (!error) {
          setEstimatedTokens(converter.tokenToDisplayValue(tokens, tokenDecimals, 2));
        }
      });
    } catch (error) {
      console.log(error);
    }

    setNextLoading(false);
  }

  const submitWithdrawal = async () => {
    const { walletAddress, bankContract, tokenDecimals } = props.data;

    try {
      const shareAmount = converter.displayToTokenValue(withdrawAmount, tokenDecimals);
      await bankContract.methods.exitPool(shareAmount)
        .send({ from: walletAddress })
        .on('receipt', function (receipt) {
          setWithdrawalReceipt(receipt);
          setNextLoading(false);

          if (receipt.events && receipt.events[0]) {
            setAmountWithdrawn(converter.tokenToDisplayValue(new BigNumber(receipt.events[0].raw.data).integerValue().toString(10), tokenDecimals, 2));
          }
        })
        .on('error', function (error, receipt) {
          setWithdrawalTxError(error?.message);
          setNextLoading(false);
        });
    } catch (error) {
      console.log(error);
      if (error.message) {
        setWithdrawalTxError(error?.message);
      }
      setNextLoading(false);
    }
  }

  const handleAmountInput = (event) => {
    setWithdrawAmount(event.target.value);
    setWithdrawAmountBN(new BigNumber2RD(event.target.value));
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
              withdrawalTxError
                ?
                <Typography sx={{ mt: 10, mb: 1, alignSelf: 'center' }} color='error'>
                  {withdrawalTxError}
                </Typography>
                : isNextLoading
                  ?
                  <CircularProgress sx={{ mt: '2.5rem', mb: 2, alignSelf: 'center' }} />
                  : withdrawalReceipt && <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} >
                      Withdrawal Request Submitted
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Amount Withdrawn" value={amountWithdrawn + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
                      <Grid item xs={3}>
                        <Typography>Transaction</Typography>
                      </Grid>
                      <Grid item xs={9}>
                        <Link href={"https://kovan.etherscan.io/tx/" + withdrawalReceipt.transactionHash} target="_blank">
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
                      label="Withdraw Amount"
                      variant="standard"
                      value={withdrawAmount}
                      onChange={handleAmountInput}
                      InputProps={{
                        endAdornment: <InputAdornment position="end">Pool Shares</InputAdornment>,
                        inputComponent: NumberFormatCustom,
                      }}
                    />
                    <Typography sx={{ mt: 0.5, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Withdrawable {sharesWithdrawable} Pool Shares
                    </Typography>
                    <Typography sx={{ mt: 0.2, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Estimated token value {sharesWithdrawableWorth} {props.data.tokenSymbol}
                    </Typography>

                    {/* <Typography sx={{ mt: 0.2, mb: 2, ml: 'auto' }} color="text.secondary">
                      Pool Liqudity {poolLiqudity} {props.data.tokenSymbol}
                    </Typography>
                  
                    <Typography sx={{ mt: 2, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Your pool shares {props.data.poolShares}
                    </Typography>
                    <Typography sx={{ mt: 0.2, mb: 0.2, ml: 'auto' }} color="text.secondary">
                      Your unlocked shares {unlockedShares}
                    </Typography> */}
                  </>,
                "1":
                  <>
                    <Typography sx={{ mt: 2, mb: 1, alignSelf: 'center' }} color="text.secondary">
                      Withdraw {withdrawAmount} Pool Shares
                    </Typography>
                    <Grid container spacing={1} sx={{ ml: 1, }}>
                      <GridRow label="Shares" value={withdrawAmount} lcWidth="3" rcWidth="9" />
                      <GridRow label="Estimated funds to be received" value={estimatedTokens + " " + props.data.tokenSymbol} lcWidth="3" rcWidth="9" />
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
              disabled={isNextLoading || (activeStep === 0 && (withdrawAmountBN.comparedTo(0) === 0 || withdrawAmountBN.comparedTo(sharesWithdrawableBN) > 0))}>
              {isNextLoading ? <CircularProgress size={18} /> : activeStep === steps.length - 1 ? 'Submit' : 'Next'}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}
