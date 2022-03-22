import React, { Component } from "react";
import Button from "@mui/material/Button";

import Web3 from "web3";

import config from "./contracts/config.json"
import ERC20 from "./contracts/ERC20.json";
import BankFairPool from "./contracts/BankFairPool.json";

import "./App.css";
import { Paper, Typography } from "@mui/material";

class App extends Component {

  state = {
    web3: null,
    selectedNetworkId: null,
    isLoggedIn: false,
    walletAddress: null,

    tokenContract: null,
    tokenAddress: null,
    tokenDecimals: 0,
    tokenSymbol: null,

    bankContract: null,
    manager: null,
  };

  componentDidMount = async () => {
    try {
      if (window.ethereum) {
        const web3 = new Web3(window.ethereum);
        window.ethereum.on("accountsChanged", (accounts) => this.handleAccountChange(accounts));
        window.ethereum.on("networkChanged", (networkId) => this.handleNetworkChange(networkId));
        this.setState({ web3 }, () => {
          this.restoreLogin();
          this.loadInitialState();
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

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

      this.setState({ isLoggedIn, walletAddress, selectedNetworkId: networkId });
      localStorage.setItem("isLoggedIn", true);
      localStorage.setItem("walletAddress", walletAddress);
    } catch (error) {
      console.error(error);
    }
  }

  restoreLogin = async () => {
    if (JSON.parse(localStorage.getItem("isLoggedIn")) === true) {
      let walletAddress = localStorage.getItem("walletAddress");
      if (walletAddress !== null) {
        this.setState({ isLoggedIn: true, walletAddress });
      }
    }
  }

  logOut = async () => {
    if (!this.state.isLoggedIn) {
      return;
    }

    this.setState({ isLoggedIn: false, walletAddress: null });
    localStorage.setItem("isLoggedIn", false);
    localStorage.removeItem("walletAddress");

    //TODO disconnect from wallet
  }

  loadInitialState = async () => {
    const { web3 } = this.state;
    if (!web3) {
      return;
    }

    try {
      const networkId = await web3.eth.net.getId();
      this.setState({selectedNetworkId: networkId});

      if (networkId !== config.APP_NETWORK_ID) {
        return;
      }
      
      const bankContract = new web3.eth.Contract(BankFairPool.abi, BankFairPool.networks[config.APP_NETWORK_ID].address);
      const tokenAddress = await bankContract.methods.token().call();
      const tokenContract = new web3.eth.Contract(ERC20.abi, tokenAddress);
      const tokenSymbol = await tokenContract.methods.symbol().call();
      const tokenDecimals = await tokenContract.methods.decimals().call();

      this.setState({ bankContract, tokenContract, tokenAddress, tokenSymbol, tokenDecimals });
    } catch (error) {
      console.error(error);
    }
  };

  loadStats = async () => {
    const { bankContract } = this.state;

    const managerAddress = await bankContract.methods.manager().call();
    console.log("Manager: " + managerAddress);

    this.setState({ manager: managerAddress });
  };

  render() {
    if (!this.state.web3) {
      return (
        <div className="App">
          <div className="App-header">
            <Typography>Install Metamask and reload.</Typography>
          </div>
        </div>
      );
    }

    if (!this.state.walletAddress) {
      return (
        <div className="App">
          <div className="App-header">
            <Button variant="outlined" onClick={this.logIn}>Connect Wallet</Button>
          </div>
        </div>
      );
    }

    return (
      <div className="App">
        <div className="App-header">
          <Typography className="notice" hidden={this.state.selectedNetworkId === config.APP_NETWORK_ID}>Switch to Kovan Test Network</Typography>
          <Typography>Connected {this.state.walletAddress}</Typography>
          <Button variant="outlined" onClick={this.logOut}>Disconnect Wallet</Button>
          <Paper></Paper>
        </div>
      </div>
    );
  }
}

export default App;
