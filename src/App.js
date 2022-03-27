import React, { Component } from "react";
import {
  Box,
  Stack,
} from "@mui/material";
import CustomAppBar from "./components/CustomAppBar";
import ProblemBanner from "./components/ProblemBanner";
import Balances from "./components/Balances";
import LoansPanel from "./components/LoansPanel";
import StakedAssetsPanel from "./components/StakedAssetsPanel";
import StatsPanel from "./components/StatsPanel";

import Web3 from "web3";
import converter from "./util/converter";

import config from "./contracts/config.json"
import ERC20 from "./contracts/ERC20.json";
import BankFairPool from "./contracts/BankFairPool.json";

import "./App.css";

class App extends Component {

  state = {
    web3: null,
    selectedNetworkId: null,
    isLoggedIn: false,
    walletAddress: null,

    tokenContract: null,
    tokenAddress: null,
    tokenSymbol: null,
    tokenDecimals: 0,

    bankContractAddress: null,
    bankContract: null,
    manager: null,

    poolShares: null,
    poolSharesWorth: null,

    contractTokenBalance: null,
    contractPoolLiqudity: null,
    loanFundsPendingWithdrawal: null,
    contractBorrowedFunds: null,
    contractPoolFunds: null,
    totalPoolShares: null,
    sharesStaked: null,
    sharesStakedUnlocked: null,

    percentDecimals: 2, //TODO retrive from contract
    defaultAPR: null,
    defaultLateFeePercent: null,
    maxDuration: null,
    minDuration: null,
    minAmount: null,
  };

  componentDidMount = async () => {

    try {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        window.ethereum.on("accountsChanged", (accounts) => this.handleAccountChange(accounts));
        window.ethereum.on("networkChanged", (networkId) => this.handleNetworkChange(networkId));
        this.setState({ web3 }, this.postConstructActions);
      }
    } catch (error) {
      console.error(error);
    }
  };

  postConstructActions = async () => {
    await this.restoreLogin();
    await this.loadContracts();
    this.postLoginActions();
    this.loadStats();
    this.loadStakedShares();
    this.loadLoanParams();
  }

  postLoginActions = async () => {
    if (!this.state.isLoggedIn) {
      return;
    }
    this.loadPoolBalances();
  }

  balanceUpdateHandler = async () => {
    this.postLoginActions();
    this.loadStats();
  }

  stakeUpdateHandler = async () => {
    this.loadStakedShares();
  }

  loanUpdateHandler = async () => {
    this.loadStats();
  }

  logIn = async () => {
    const { web3, isLoggedIn } = this.state;
    if (!web3 || isLoggedIn) {
      return;
    }

    try {
      const networkId = await web3.eth.net.getId();
      if (networkId !== config.APP_NETWORK_ID) {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: config.APP_NETWORK_ID_HEX }],
        });
      }

      await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const accounts = await web3.eth.getAccounts();
      let walletAddress = null;
      let isLoggedIn = false;
      if (accounts.length > 0) {
        walletAddress = accounts[0];
        isLoggedIn = true;
      } else {
        alert("No wallet adresses found, set up a wallet and try again.");
        console.log("App: No wallet addresses found.");
        return;
      }

      await this.setState({ isLoggedIn, walletAddress, selectedNetworkId: networkId });
      localStorage.setItem("isLoggedIn", true);
      localStorage.setItem("walletAddress", walletAddress);
    } catch (error) {
      console.error(error);
    }

    this.postLoginActions();
  }

  logOut = async () => {
    if (!this.state.isLoggedIn) {
      return;
    }

    localStorage.setItem("isLoggedIn", false);
    localStorage.removeItem("walletAddress");

    //FIXME add fields to reset on logout
    this.setState({
      isLoggedIn: false,
      walletAddress: null,

      poolShares: "0",
      poolSharesWorth: "0",
    });

    //TODO disconnect from wallet
  }

  handleAccountChange = async (accounts) => {
    if (!this.state.isLoggedIn) {
      return;
    }
    this.logOut();
  }

  handleNetworkChange = async (networkId) => {
    if (!this.state.isLoggedIn) {
      return;
    }
    this.setState({ selectedNetworkId: parseInt(networkId, 10) });
  }

  restoreLogin = async () => {
    if (JSON.parse(localStorage.getItem("isLoggedIn")) === true) {
      let walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress !== null) {
        this.setState({ isLoggedIn: true, walletAddress });
      }
    }
  }

  loadContracts = async () => {
    const { web3 } = this.state;
    if (!web3) {
      return;
    }

    try {
      const networkId = await web3.eth.net.getId();
      this.setState({ selectedNetworkId: networkId });

      if (networkId !== config.APP_NETWORK_ID) {
        return;
      }
      const bankContractAddress = BankFairPool.networks[config.APP_NETWORK_ID].address;
      const bankContract = new web3.eth.Contract(BankFairPool.abi, bankContractAddress);
      const tokenAddress = await bankContract.methods.token().call();
      const tokenContract = new web3.eth.Contract(ERC20.abi, tokenAddress);
      const tokenSymbol = await tokenContract.methods.symbol().call();
      const tokenDecimals = parseInt(await tokenContract.methods.decimals().call());

      const manager = await bankContract.methods.manager().call();

      await this.setState({
        manager,
        bankContractAddress,
        bankContract,
        tokenContract,
        tokenAddress,
        tokenSymbol,
        tokenDecimals,
      });
    } catch (error) {
      console.error(error);
    }
  };

  loadPoolBalances = async () => {
    if (!this.state.isLoggedIn) {
      return;
    }

    const { walletAddress, bankContract, tokenDecimals } = this.state;

    bankContract.methods.sharesOf(walletAddress).call((error, poolShares) => {
      if (error) {
        return;
      }
      bankContract.methods.sharesToTokens(poolShares).call((error, poolSharesWorth) => {
        if (error) {
          return;
        }
        this.setState({
          poolShares: converter.tokenToDisplayValue(poolShares, tokenDecimals, 2),
          poolSharesWorth: converter.tokenToDisplayValue(poolSharesWorth, tokenDecimals, 2)
        });
      });
    });
  }

  loadStakedShares = async () => {
    const { walletAddress, bankContract, tokenDecimals } = this.state;

    try {
      bankContract.methods.sharesStaked().call((error, sharesStaked) => {
        if (error) {
          return;
        }
        bankContract.methods.sharesToTokens(sharesStaked).call((error, sharesStakedWorth) => {
          if (error) {
            return;
          }
          this.setState({
            sharesStaked: converter.tokenToDisplayValue(sharesStaked, tokenDecimals, 2),
            sharesStakedWorth: converter.tokenToDisplayValue(sharesStakedWorth, tokenDecimals, 2)
          });
        });
      });

    } catch (error) {
      console.log(error);
    }
  }

  loadStats = async () => {
    const { web3, walletAddress, bankContract, tokenDecimals, percentDecimals } = this.state;
    if (!web3) {
      return;
    }

    bankContract.methods.tokenBalance().call((error, value) => {
      if (!error) {
        this.setState({ contractTokenBalance: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.poolLiqudity().call((error, value) => {
      if (!error) {
        this.setState({ contractPoolLiqudity: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.loanFundsPendingWithdrawal().call((error, value) => {
      if (!error) {
        this.setState({ loanFundsPendingWithdrawal: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.borrowedFunds().call((error, value) => {
      if (!error) {
        this.setState({ contractBorrowedFunds: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.poolFunds().call((error, value) => {
      if (!error) {
        this.setState({ contractPoolFunds: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.totalPoolShares().call((error, value) => {
      if (!error) {
        this.setState({ totalPoolShares: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    /*
    bankContract.methods.sharesStaked().call((error, value) => {
      if (!error) {
        this.setState({ sharesStaked: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });
    */

    bankContract.methods.sharesStakedUnlocked().call((error, value) => {
      if (!error) {
        this.setState({ sharesStakedUnlocked: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });
  }

  loadLoanParams = async () => {
    const { web3, walletAddress, bankContract, tokenDecimals, percentDecimals } = this.state;
    if (!web3) {
      return;
    }

    bankContract.methods.defaultAPR().call((error, value) => {
      if (!error) {
        this.setState({ defaultAPR: converter.percentToDisplayValue(value, percentDecimals, 2) });
      }
    });

    bankContract.methods.defaultLateFeePercent().call((error, value) => {
      if (!error) {
        this.setState({ defaultLateFeePercent: converter.percentToDisplayValue(value, percentDecimals, 2) });
      }
    });

    bankContract.methods.minAmount().call((error, value) => {
      if (!error) {
        this.setState({ minAmount: converter.tokenToDisplayValue(value, tokenDecimals, 2) });
      }
    });

    bankContract.methods.minDuration().call((error, value) => {
      if (!error) {
        this.setState({ minDuration: converter.secondsToDays(value) });
      }
    });

    bankContract.methods.maxDuration().call((error, value) => {
      if (!error) {
        this.setState({ maxDuration: converter.secondsToDays(value) });
      }
    });
  }

  render() {
    return (
      <div>
        <Box className="main-container" sx={{ flexGrow: 1 }}>
          <CustomAppBar
            isLoggedIn={this.state.isLoggedIn}
            walletAddress={this.state.walletAddress}
            onLogIn={this.logIn}
            onLogOut={this.logOut}
          />
          <ProblemBanner
            isWalletMissing={this.state.web3 === null}
            isWrongNetwork={this.state.selectedNetworkId !== config.APP_NETWORK_ID}
          />
          <Stack className="padding_0_5_rem" spacing={2}>
            {
              this.state.isLoggedIn &&
              <>
                <Balances data={this.state} onBalanceUpdate={this.balanceUpdateHandler} />
              </>
            }
            <StakedAssetsPanel data={this.state} onTransact={this.stakeUpdateHandler} />
            <LoansPanel data={this.state} onTransact={this.loanUpdateHandler} />
            <StatsPanel data={this.state} />
          </Stack>
        </Box>
      </div>
    );
  }
}

export default App;
