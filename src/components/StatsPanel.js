import {
  Grid,
  Card,
} from "@mui/material";

import Title from "./Title";
import GridRow from "./GridRow";

function StatsPanel(props) {

  return (
    <Card className="content">
      <Title>Stats (Debug Info)</Title>
      <Grid container spacing={1} sx={{ ml: 1, }}>
        <GridRow lcWidth="6" rcWidth="6" label="Manager" value={props.data.manager} />
        <GridRow lcWidth="6" rcWidth="6" label="Pool token" value={props.data.tokenAddress} />

        <GridRow
          lcWidth="6" rcWidth="6" label="Contract token balance"
          value={props.data.contractTokenBalance ? props.data.contractTokenBalance + " " + props.data.tokenSymbol : ""} />

        <GridRow
          lcWidth="6" rcWidth="6" label="Pool liqudity"
          value={props.data.contractPoolLiqudity ? props.data.contractPoolLiqudity + " " + props.data.tokenSymbol : ""} />

        <GridRow lcWidth="6" rcWidth="6" label="Loan funds pending withdrawal"
          value={props.data.loanFundsPendingWithdrawal ? props.data.loanFundsPendingWithdrawal + " " + props.data.tokenSymbol : ""} />

        <GridRow lcWidth="6" rcWidth="6" label="Borrowed funds"
          value={props.data.contractBorrowedFunds ? props.data.contractBorrowedFunds + " " + props.data.tokenSymbol : ""} />

        <GridRow lcWidth="6" rcWidth="6" label="Pool funds"
          value={props.data.contractPoolFunds ? props.data.contractPoolFunds + " " + props.data.tokenSymbol : ""} />

        <GridRow lcWidth="6" rcWidth="6" label="Total pool shares" value={props.data.totalPoolShares} />
        <GridRow lcWidth="6" rcWidth="6" label="Shares staked" value={props.data.sharesStaked} />
        <GridRow lcWidth="6" rcWidth="6" label="Shares staked unlocked" value={props.data.sharesStakedUnlocked} />
        <GridRow lcWidth="6" rcWidth="6"/>
        <GridRow lcWidth="6" rcWidth="6" label="Loan Parameters:" />
        <GridRow lcWidth="6" rcWidth="6" label="APR" 
        value={props.data.defaultAPR ? props.data.defaultAPR + "%" : ""} />
        <GridRow lcWidth="6" rcWidth="6" label="Late payment APR delta" 
        value={props.data.defaultLateFeePercent ? props.data.defaultLateFeePercent + "%" : ""} />
        <GridRow lcWidth="6" rcWidth="6" label="Min amount" 
        value={props.data.minAmount ? props.data.minAmount + " " + props.data.tokenSymbol : ""} />
        <GridRow lcWidth="6" rcWidth="6" label="Min duration" 
        value={props.data.minDuration ? props.data.minDuration + " day(s)" : ""} />
        <GridRow lcWidth="6" rcWidth="6" label="Max duration" 
        value={props.data.maxDuration ? props.data.maxDuration + " day(s)" : ""} />
      </Grid>
    </Card>
  );
}

export default StatsPanel;
