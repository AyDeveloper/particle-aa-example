import React, { useState, useEffect, useCallback } from 'react';
import { useEthereum, useConnect, useAuthCore } from '@particle-network/auth-core-modal';
import { EthereumSepolia } from '@particle-network/chains';
import { AAWrapProvider, SmartAccount, SendTransactionMode } from '@particle-network/aa';
import { ethers } from "ethers";
import { notification } from 'antd';
import { abi } from "./constants/abi";
import "../src/App.css"
import { contractAddress } from "./constants/address";

const App = () => {
  const { provider } = useEthereum();
  const { connect, disconnect } = useConnect();
  const { userInfo } = useAuthCore();

  const [balance, setBalance] = useState(0);
  const [address, setAddress] = useState("");
  const [customProvider, setCustomProvider] = useState(null);

  useEffect(() => {
    const initializeProvider = async () => {
      const smartAccount = new SmartAccount(provider, {
        projectId: process.env.REACT_APP_PROJECT_ID || 'undefined',
        clientKey: process.env.REACT_APP_CLIENT_KEY || 'undefined',
        appId: process.env.REACT_APP_APP_ID || 'undefined',
        aaOptions: {
          accountContracts: {
            SIMPLE: [{ chainIds: [EthereumSepolia.id], version: '1.0.0' }],
          }
        }
      });

      const newCustomProvider = new ethers.BrowserProvider(
        new AAWrapProvider(smartAccount, SendTransactionMode.Gasless),
        "any"
      );

      setCustomProvider(newCustomProvider);

      const addr = await smartAccount.getAddress();
      setAddress(addr.toString());
    };

    if (provider && userInfo) {
      initializeProvider();
    }
  }, [provider, userInfo]);

  const fetchBalance = useCallback(async () => {
    if (!customProvider || !address) {
      console.log("Provider or address not initialized yet");
      return;
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, customProvider);
      const balance = await contract.balanceOf(address);
      setBalance(balance.toString());
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  }, [customProvider, address]);

  useEffect(() => {
    if (userInfo && customProvider && address) {
      fetchBalance();
    }
  }, [userInfo, customProvider, address, fetchBalance]);

  const handleLogin = async (authType) => {
    if (!userInfo) {
      await connect({
          socialType: authType,
          chain: EthereumSepolia,
      });
    }
  };

  const executeMint = async () => {
    if (!customProvider) {
      console.log("provider not initialized yet");
      return;
    }
    const signer = await customProvider.getSigner();

    // const contract = new Contract(contractAddress, contractABI, provider);
    const contract = new ethers.Contract(contractAddress, abi, signer);

    // Send transaction to smart contract to update message
    const tx = await contract.connect(signer).safeMint(address, "https://ipfs.filebase.io/ipfs/QmYg7RLt2i43hLKmcXMHzYDcocNpjeXPjTxJabn7f2ETxM");

    // Wait for transaction to finish
    const receipt = await tx.wait();
    console.log(receipt.hash);
    notification.success({
      message: `https://sepolia.etherscan.io/txs/${receipt.hash}`
    });
  };

  return (
    <div className="App">
      <div className="logo-header">
        <img src="https://i.ibb.co/kMwytgp/w3cl-img.jpg" alt="kaia-logo" border="0"  width="120px"/>      
         <h2>W3LConf Gateway</h2>
      </div>
      {!userInfo ? (
      <div className="login-section">
        <button className="w-4 border-red-900" onClick={() => handleLogin('google')}>
          Sign in with Google
        </button>
        <button className="w-4" onClick={() => handleLogin('twitter')}>
          Sign in with X
        </button>
      </div>
      ) : (
        <div className="profile-card">
          <h2 className='text-white'>{userInfo.name}</h2>
          <div className="balance-section">
           {balance > 0 ? 
            (
              <div className='welcome-section'>
                <h2 >Welcome to W3LConf</h2>
                <button className="sign-message-button" onClick={disconnect}>Disconnect</button>
              </div>
            ) 
            : 
            (
              <div>
              <p>Cannot Enter into W3LConf Session</p>
              <button className="sign-message-button" onClick={executeMint}>Mint NFT</button>
              <button className="sign-message-button" onClick={disconnect}>Disconnect</button>
              </div>
            )
            
          }
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
