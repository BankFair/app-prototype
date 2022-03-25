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

import StakeStepper from "./StakeStepper";
import UnstakeStepper from "./UnstakeStepper";

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

function StakedAssetsPanel(props) {

  const [stakeModalOpen, setStakeModalOpen] = React.useState(false);
  const handleOpenStakeModal = () => setStakeModalOpen(true);
  const handleCloseStakeModal = () => {
    setStakeModalOpen(false);
    props.onTransact();
  }

  const [unstakeModalOpen, setUnstakeModalOpen] = React.useState(false);
  const handleOpenUnstakeModal = () => setUnstakeModalOpen(true);
  const handleCloseUnstakeModal = () => {
    setUnstakeModalOpen(false);
    props.onTransact();
  }

  return (
    <>
      <Card className="content">
        <Title>Staked Shares</Title>
        <Grid container spacing={1} sx={{ ml: 1, }}>
          <GridRow label="Manager's staked shares" value={props.data.sharesStaked} lcWidth="6" rcWidth="6" />
          <GridRow label="Current token value" value={props.data.sharesStakedWorth ? props.data.sharesStakedWorth + " " + props.data.tokenSymbol : ""} lcWidth="6" rcWidth="6" />
          {
            (props.data.isLoggedIn && props.data.manager && props.data.manager === props.data.walletAddress) &&
            <Toolbar spacing={1} sx={{ ml: "auto", mr: 1 }}>
              <Button sx={{ mr: 1 }} className="action-button" variant="outlined" color="success" onClick={handleOpenStakeModal}>Stake</Button>
              <Button className="action-button" variant="outlined" color="error" onClick={handleOpenUnstakeModal}>Unstake</Button>
            </Toolbar>
          }
        </Grid>
      </Card>
      <Modal
        open={stakeModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <StakeStepper closeHandler={handleCloseStakeModal} data={props.data} />
        </Box>
      </Modal>
      <Modal
        open={unstakeModalOpen}
        backdrop="static"
      >
        <Box sx={modalStyle}>
          <UnstakeStepper closeHandler={handleCloseUnstakeModal} data={props.data} />
        </Box>
      </Modal>
    </>
  );
}

export default StakedAssetsPanel;
