import React from "react";
import {
  Grid,
  Card,
  Box,
  Modal,
  Button,
  Toolbar,
} from "@mui/material";

import Title from "./Title";
import GridRow from "./GridRow";

import DepositStepper from "./DepositStepper";
import WithdrawalStepper from "./WithdrawalStepper";

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

function Balances(props) {

  const [depositModalOpen, setDepositModalOpen] = React.useState(false);
  const handleOpenDepositModal = () => setDepositModalOpen(true);
  const handleCloseDepositModal = () => setDepositModalOpen(false);

  const [withdrawModalOpen, setWithdrawModalOpen] = React.useState(false);
  const handleOpenWithdrawModal = () => setWithdrawModalOpen(true);
  const handleCloseWithdrawModal = () => setWithdrawModalOpen(false);

  return (
    <>
      <Card className="content">
        <Title>Balances</Title>
        <Grid container spacing={1} sx={{ ml: 1, }}>
          <GridRow label="Pool shares" value={props.data.poolShares} lcWidth="6" rcWidth="6" />
          <GridRow label="Current token value" value={props.data.poolSharesWorth ? props.data.poolSharesWorth + " " + props.data.tokenSymbol : ""} lcWidth="6" rcWidth="6" />
          <Toolbar spacing={1} sx={{ ml: "auto", mr: 1 }}>
            <Button sx={{ mr: 1 }} className="action-button" variant="outlined" color="success" onClick={handleOpenDepositModal}>Deposit</Button>
            <Button className="action-button" variant="outlined" color="error" onClick={handleOpenWithdrawModal}>Withdraw</Button>
          </Toolbar>
        </Grid>
      </Card>
      <Modal
        open={depositModalOpen}
        onClose={handleCloseDepositModal}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <DepositStepper closeHandler={handleCloseDepositModal} />
        </Box>
      </Modal>
      <Modal
        open={withdrawModalOpen}
        onClose={handleCloseWithdrawModal}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <WithdrawalStepper closeHandler={handleCloseWithdrawModal} />
        </Box>
      </Modal>
    </>
  );
}

export default Balances;
