import {
  Grid,
  Typography,
} from "@mui/material";

function GridRow(props) {
  return (
    <>
      <Grid item xs={props.lcWidth}>
        <Typography>{props.label}</Typography>
      </Grid><Grid item xs={props.rcWidth}>
        <Typography>{props.value}</Typography>
      </Grid>
    </>
  );
}

export default GridRow;
