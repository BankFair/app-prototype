import React, { useEffect } from "react";
import {
  Grid,
  Card,
  Box,
  Modal,
  Button,
  Toolbar,
  Typography,
  TextField,
  CircularProgress,
} from "@mui/material";

import Title from "./Title";
import GridRow from "./GridRow";

import LoanApplicationStepper from "./LoanApplicationStepper";
import converter, { BigNumber2RD } from "../util/converter";
import ApproveLoanStepper from "./ApproveLoanStepper";
import DenyLoanStepper from "./DenyLoanStepper";
import CancelLoanStepper from "./CancelLoanStepper";
import TakeLoanStepper from "./TakeLoanStepper";
import RepayLoanStepper from "./RepayLoanStepper";
import DefaultLoanStepper from "./DefaultLoanStepper";

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: '40%',
  bgcolor: 'background.paper',
  boxShadow: 24,
  p: 4,
};

const LoanStatus = {
  "0": "APPLIED",
  "1": "DENIED",
  "2": "APPROVED",
  "3": "CANCELLED",
  "4": "FUNDS WITHDRAWN",
  "5": "REPAID",
  "6": "DEFAULTED"
}

const DAY_SECONDS = 86400;

export default function Loans(props) {
  const validInputPattern = /(^$)|(?:^0x[a-fA-F0-9]{0,40}$)|(?:^\d+$)/;
  const loanIdPattern = /^\d+$/;
  const addressPattern = /^0x[a-fA-F0-9]{40}$/;

  const [hasOpenApplication, setHasLoanApplication] = React.useState(false);
  const [recentLoanId, setRecentLoanId] = React.useState(null);

  const [inputLoanSearch, setInputLoanSearch] = React.useState("");
  const [isLoading, setLoading] = React.useState(false);
  const [isLoanFound, setLoanFound] = React.useState(false);

  const [loanApplication, setLoanApplication] = React.useState({
    id: null,
    status: null,
    borrower: null,
    amount: null,
    duration: null,
    apr: null,
    lateAPR: null,
    appliedTime: null,
  });
  const [loanDetail, setLoanDetail] = React.useState({
    loanId: null,
    totalAmountPaid: null,
    baseAmountRepaid: null,
    interestPaid: null,
    approvedTime: null,
    lastPaymentTime: null
  });

  const [applyModalOpen, setApplyModalOpen] = React.useState(false);
  const handleOpenApplyModal = () => setApplyModalOpen(true);
  const handleCloseApplyModal = () => {
    setApplyModalOpen(false);
    props.onTransact();
  }

  const [approveModalOpen, setApproveModalOpen] = React.useState(false);
  const handleOpenApproveModal = () => setApproveModalOpen(true);
  const handleCloseApproveModal = () => {
    setApproveModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  const [denyModalOpen, setDenyModalOpen] = React.useState(false);
  const handleOpenDenyModal = () => setDenyModalOpen(true);
  const handleCloseDenyModal = () => {
    setDenyModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  const [cancelModalOpen, setCancelModalOpen] = React.useState(false);
  const handleOpenCancelModal = () => setCancelModalOpen(true);
  const handleCloseCancelModal = () => {
    setCancelModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  const [takeLoanModalOpen, setTakeLoanModalOpen] = React.useState(false);
  const handleOpenTakeLoanModal = () => setTakeLoanModalOpen(true);
  const handleCloseTakeLoanModal = () => {
    setTakeLoanModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  const [defaultLoanModalOpen, setDefaultLoanModalOpen] = React.useState(false);
  const handleOpenDefaultLoanModal = () => setDefaultLoanModalOpen(true);
  const handleCloseDefaultLoanModal = () => {
    setDefaultLoanModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  const [repayModalOpen, setRepayModalOpen] = React.useState(false);
  const handleOpenRepayModal = () => setRepayModalOpen(true);
  const handleCloseRepayModal = () => {
    setRepayModalOpen(false);
    if (loanApplication) {
      loadLoan(loanApplication.id);
    }
  }

  useEffect(() => {
    const { isLoggedIn, walletAddress, bankContract } = props.data;
    if (!isLoggedIn || !bankContract) {
      setRecentLoanId(null);
      return;
    }

    try {
      bankContract.methods.recentLoanIdOf(walletAddress).call((error, loanId) => {
        if (error || loanId === "0") {
          return;
        }
        setRecentLoanId(loanId);
        loadLoan(loanId);
      });
    } catch (error) {
      console.log(error);
    }
  }, [props.data]);

  const handleInput = (event) => {
    if (!validInputPattern.test(event.target.value)) {
      console.log("invalid");
      return;
    }
    setInputLoanSearch(event.target.value);
  };

  const recentLoanIdOfUser = async (wallet) => {
    const { isLoggedIn, bankContract } = props.data;
    if (!isLoggedIn || !bankContract) {
      return null;
    }

    try {
      return await bankContract.methods.recentLoanIdOf(wallet).call();
    } catch (error) {
      console.log(error);
    }

    return null;
  }

  const search = async () => {
    let loanId;
    if (loanIdPattern.test(inputLoanSearch)) {
      loanId = (' ' + inputLoanSearch).slice(1);
    } else if (addressPattern.test(inputLoanSearch)) {
      loanId = await recentLoanIdOfUser(inputLoanSearch);
    } else {
      //should not get here, seach button must be diabled for incomplete address
      return;
    }

    loadLoan(loanId);
  }

  const loadLoan = (loanId) => {
    setLoading(true);
    setLoanFound(false);

    const { bankContract, tokenDecimals, percentDecimals } = props.data;

    try {
      bankContract.methods.loans(loanId).call((error, loanApplicationRaw) => {
        if (!error) {
          if (loanApplicationRaw.id && loanApplicationRaw.id !== "0") {
            bankContract.methods.loanDetails(loanId).call((error, loanDetailRaw) => {
              if (!error) {
                setLoanApplication({
                  id: loanApplicationRaw.id,
                  status: LoanStatus[loanApplicationRaw.status],
                  borrower: loanApplicationRaw.borrower,
                  amount: converter.tokenToDisplayValue(loanApplicationRaw.amount, tokenDecimals, 2),
                  duration: new BigNumber2RD(loanApplicationRaw.duration).dividedBy(DAY_SECONDS).integerValue().toString(10),
                  apr: converter.percentToDisplayValue(loanApplicationRaw.apr, percentDecimals, 2),
                  lateAPR: converter.percentToDisplayValue(loanApplicationRaw.lateFeePercent, percentDecimals, 2),
                  appliedTime: new Date(parseInt(loanApplicationRaw.appliedTime) * 1000).toUTCString(),
                });

                if (loanDetailRaw.loanId && loanDetailRaw.id !== "0") {
                  setLoanDetail({
                    loanId: loanDetailRaw.loanId,
                    totalAmountPaid: converter.tokenToDisplayValue(loanDetailRaw.totalAmountPaid, tokenDecimals, 2),
                    baseAmountRepaid: converter.tokenToDisplayValue(loanDetailRaw.baseAmountRepaid, tokenDecimals, 2),
                    interestPaid: converter.tokenToDisplayValue(loanDetailRaw.interestPaid, tokenDecimals, 2),
                    approvedTime: new Date(parseInt(loanDetailRaw.grantedTime) * 1000).toUTCString(),
                    lastPaymentTime: parseInt(loanDetailRaw.lastPaymentTime) > 0 ? new Date(parseInt(loanDetailRaw.lastPaymentTime) * 1000).toUTCString() : null,
                  });
                } else {
                  setLoanDetail({});
                }
                setLoanFound(true);
              }

              setLoading(false);
            });
          } else {
            setLoanFound(false);

            setLoanApplication({});
            setLoanDetail({});

            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      });
    } catch (error) {
      console.log(error);
      setLoanFound(false);
      setLoading(false);
    }
  }

  return (
    <>
      <Card className="content" sx={{ pb: 2 }}>
        <Title>Loans</Title>

        <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2, mb: '0', mr: 2, ml: 2, }}>
          <TextField sx={{ flex: '1 1 auto', mt: 0, mb: 0, }}
            label="Loan ID or Wallet Address"
            variant="standard"
            value={inputLoanSearch}
            onChange={handleInput}
            InputProps={{
              pattern: "/(^$)|(?:^0x[a-fA-F0-9]{0,40}$)|(?:^d+$)/",
            }}
          />
          <Button sx={{ ml: 1, mb: 0, mt: 'auto', width: '12rem' }} className="action-button" variant="outlined"
            disabled={isLoading || !props.data.bankContract || /(?:^0x[a-fA-F0-9]{40}$)|(?:^\d+$)/.test(inputLoanSearch) === false}
            onClick={search}
          >
            Look up
          </Button>
          {
            props.data.isLoggedIn && !(props.data.manager && props.data.manager === props.data.walletAddress) &&
            <Button sx={{ ml: 1, mb: 0, mt: 'auto', width: '12rem' }} className="action-button" variant="outlined" color="success"
              onClick={handleOpenApplyModal} disabled={hasOpenApplication}>
              Apply for a Loan
            </Button>
          }
        </Box>
        {
          (recentLoanId && recentLoanId > 0)
          && <Typography sx={{ ml: 2, mt: 1 }} color="text.secondary">Your most recent loan id: {recentLoanId}</Typography>
        }
        {isLoanFound &&
          <>
            <Typography sx={{ mt: 2, mb: 1, ml: 2 }}>Loan</Typography>
            <Grid>
              <Grid container spacing={0} sx={{ ml: 2, }}>
                <GridRow label="Loan ID " value={loanApplication.id} lcWidth="6" rcWidth="6" />
                <GridRow label="Status" value={loanApplication.status} lcWidth="6" rcWidth="6" />
                <GridRow label="Borrower" value={loanApplication.borrower} lcWidth="6" rcWidth="6" />
                <GridRow label="Amount" value={loanApplication.amount + " " + props.data.tokenSymbol} lcWidth="6" rcWidth="6" />
                <GridRow label="Duration" value={loanApplication.duration + " day(s)"} lcWidth="6" rcWidth="6" />
                <GridRow label="APR" value={loanApplication.apr + "%"} lcWidth="6" rcWidth="6" />
                <GridRow label="Late payment APR delta" value={loanApplication.lateAPR + "%"} lcWidth="6" rcWidth="6" />
                <GridRow label="Applied time" value={loanApplication.appliedTime} lcWidth="6" rcWidth="6" />
              </Grid>
            </Grid>

            {
              (loanDetail.loanId && loanDetail.loanId !== "0") &&
              <>
                <Typography sx={{ mt: 2, mb: 1, ml: 2 }}>Loan Details</Typography>
                <Grid container spacing={0} sx={{ ml: 2, mb: 1 }}>
                  <GridRow label="Approved time" value={loanDetail.approvedTime} lcWidth="6" rcWidth="6" />
                  {loanDetail.lastPaymentTime && <GridRow label="Last payment time" value={loanDetail.lastPaymentTime} lcWidth="6" rcWidth="6" />}
                  {
                    loanApplication.status === "FUNDS WITHDRAWN" &&
                    <>
                      <GridRow label="Total amount repaid" value={loanDetail.totalAmountPaid + " " + props.data.tokenSymbol} lcWidth="6" rcWidth="6" />
                      <GridRow label="Base amount repaid" value={loanDetail.baseAmountRepaid + " " + props.data.tokenSymbol} lcWidth="6" rcWidth="6" />
                      <GridRow label="Interest paid" value={loanDetail.interestPaid + " " + props.data.tokenSymbol} lcWidth="6" rcWidth="6" />
                    </>
                  }
                </Grid>
              </>
            }
          </>
        }
        {!isLoanFound &&
          <Typography sx={{ mt: 2, mb: 1, ml: 2, alignSelf: 'center' }} color='text.secondary'>
            Loan not found.
          </Typography>
        }
        {
          isLoading &&
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'left' }}><CircularProgress sx={{ mt: 2, mb: 2, alignSelf: 'center' }} /></Box>
        }
        {
          (isLoanFound && props.data.isLoggedIn && loanApplication.status !== "REPAID") &&
          <Grid container spacing={0} sx={{ display: 'flex', flexDirection: 'column', ml: 2, mr: 1, }}>
            {
              props.data.walletAddress && props.data.walletAddress === loanApplication.borrower &&
              (loanApplication.status === "APPROVED" || loanApplication.status === "FUNDS WITHDRAWN") &&
              <Toolbar spacing={1} sx={{ ml: "auto", mr: 1, }}>
                {
                  {
                    "APPROVED":
                      <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="error" onClick={handleOpenTakeLoanModal} >Take Funds</Button>,
                    "FUNDS WITHDRAWN":
                      <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="success" onClick={handleOpenRepayModal} >Repay</Button>,
                  }[[loanApplication.status]]
                }
              </Toolbar>
            }
            {
              (props.data.manager && props.data.manager === props.data.walletAddress && loanApplication.status !== "REPAID") &&
              <Toolbar spacing={1} sx={{ ml: "auto", mr: 1, }}>
                {
                  {
                    "APPLIED":
                      <>
                        <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="success" onClick={handleOpenApproveModal}>
                          Approve
                        </Button>
                        <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="error"  onClick={handleOpenDenyModal}>Deny</Button>
                      </>,
                    "APPROVED":
                      <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="error" onClick={handleOpenCancelModal} >Cancel</Button>,
                    "FUNDS WITHDRAWN":
                      <Button sx={{ ml: 1 }} className="action-button" variant="outlined" color="error" onClick={handleOpenDefaultLoanModal} >Default</Button>
                  }[loanApplication.status]
                }
              </Toolbar>
            }
          </Grid>
        }
      </Card>
      <Modal
        open={applyModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <LoanApplicationStepper closeHandler={handleCloseApplyModal} data={props.data} />
        </Box>
      </Modal>

      <Modal
        open={approveModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <ApproveLoanStepper closeHandler={handleCloseApproveModal} data={props.data} loanApplication={loanApplication} />
        </Box>
      </Modal>

      <Modal
        open={denyModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <DenyLoanStepper closeHandler={handleCloseDenyModal} data={props.data} loanApplication={loanApplication} />
        </Box>
      </Modal>

      <Modal
        open={cancelModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <CancelLoanStepper closeHandler={handleCloseCancelModal} data={props.data} loanApplication={loanApplication} loanDetail={loanDetail} />
        </Box>
      </Modal>

      <Modal
        open={takeLoanModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <TakeLoanStepper closeHandler={handleCloseTakeLoanModal} data={props.data} loanApplication={loanApplication} loanDetail={loanDetail} />
        </Box>
      </Modal>

      <Modal
        open={repayModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <RepayLoanStepper closeHandler={handleCloseRepayModal} data={props.data} loanId={loanApplication.id} />
        </Box>
      </Modal>

      <Modal
        open={defaultLoanModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <DefaultLoanStepper closeHandler={handleCloseDefaultLoanModal} data={props.data} loanApplication={loanApplication} loanDetail={loanDetail} />
        </Box>
      </Modal>
    </>
  );
}
