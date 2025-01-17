"use client"
import React, { useState, useEffect } from 'react';
import Web3 from 'web3';

const WalletConnect = () => {
  const [account, setAccount] = useState('');
  const [balance, setBalance] = useState('');
  const [chainId, setChainId] = useState('');
  const [error, setError] = useState('');
  const [toAddress, setToAddress] = useState('');
  const [selectedNetwork, setSelectedNetwork] = useState('');
  const [message, setMessage] = useState('');
  const [signature, setSignature] = useState('');
  const [flowWalletProvider, setFlowWalletProvider] = useState(null)

  const setupEventListeners = () => {
    // 监听钱包公告事件
    window.addEventListener(
      'eip6963:announceProvider',
      ((event: CustomEvent) => {
        const { info, provider } = event.detail;
        console.log('Wallet announced:', info.name);
        if (info.rdns == 'com.flowfoundation.wallet') {
          setFlowWalletProvider(provider)
        }

      }) as EventListener
    );
  }


  useEffect(() => {
    setupEventListeners()
  }, [])



  const CUSTOM_NETWORKS: any = {
    // Flow evm mainnet
    747: {
      chainId: 747,
      chainName: 'Flow EVM Mainnet',
      nativeCurrency: {
        name: 'FLOW',
        symbol: 'FLOW',
        decimals: 18
      },
      rpcUrls: ['https://mainnet.evm.nodes.onflow.org'],
      blockExplorerUrls: ['https://evm.flowscan.io/']
    },
    // Flow evm testnet
    545: {
      chainId: 545,
      chainName: 'Flow EVM Testnet',
      nativeCurrency: {
        name: 'FLOW',
        symbol: 'FLOW',
        decimals: 18
      },
      rpcUrls: ['https://testnet.evm.nodes.onflow.org'],
      blockExplorerUrls: ['https://evm-testnet.flowscan.io']
    }
  };


  async function addCustomNetwork(networkKey: string) {
    try {
      const network = CUSTOM_NETWORKS[networkKey];
      if (!network) {
        throw new Error('未找到网络配置');
      }

      // 格式化 chainId 为十六进制
      const chainIdHex = `0x${network.chainId.toString(16)}`;

      // 先尝试切换到该网络
      try {
        //@ts-ignore
        await flowWalletProvider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        return true;
      } catch (switchError: any) {
        // 如果网络不存在（错误代码 4902），则添加网络
        if (switchError.code === 4902) {
          //@ts-ignore
          await flowWalletProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: chainIdHex,
              chainName: network.chainName,
              nativeCurrency: network.nativeCurrency,
              rpcUrls: network.rpcUrls,
              blockExplorerUrls: network.blockExplorerUrls
            }]
          });
          return true;
        }
        throw switchError;
      }
    } catch (error) {
      console.error('添加网络失败：', error);
      throw error;
    }
  }

  // connect wallet
  const connectWallet = async () => {
    try {

      //@ts-ignore
      const web3 = new Web3(flowWalletProvider);

      //@ts-ignore
      await flowWalletProvider.request({ method: 'eth_requestAccounts' });
      const accounts = await web3.eth.getAccounts();

      const chainId = await web3.eth.getChainId();
      const balance = await web3.eth.getBalance(accounts[0]);

      setAccount(accounts[0]);
      setChainId(chainId.toString());
      setBalance(web3.utils.fromWei(balance, 'ether'));
      setError('');

    } catch (err: any) {
      console.log(err)
      setError('Connect wallet failed:' + err.message);
    }
  };


  // send transaction
  const sendTransaction = async (to: string, amount: string) => {
    try {
      //@ts-ignore
      const web3 = new Web3(flowWalletProvider);
      const accounts = await web3.eth.getAccounts();

      const from = accounts[0];

      // convert ETH to Wei
      const value = web3.utils.toWei(amount, 'ether');

      // get gas price
      const gasPrice = await web3.eth.getGasPrice();

      // estimate gas
      const gasEstimate = await web3.eth.estimateGas({
        from,
        to,
        value
      });

      // build transaction
      const tx = {
        from,
        to,
        value,
        gas: gasEstimate,
        gasPrice
      };

      // send transaction
      const receipt = await web3.eth.sendTransaction(tx);

      return {
        success: true,
        hash: receipt.transactionHash,
        receipt
      };

    } catch (err: any) {
      setError('Send transaction failed:' + err.message);
    }
  };





  const signMessage = async (message: string) => {
    try {
      //@ts-ignore
      const web3 = new Web3(flowWalletProvider);
      const accounts = await web3.eth.getAccounts();
      const from = accounts[0];

      // convert message to hex
      const messageHex = web3.utils.utf8ToHex(message);

      // sign message
      const signature = await web3.eth.personal.sign(
        messageHex,
        from,
        '' // password (empty for MetaMask)
      );

      setSignature(signature);

      return {
        success: true,
        message,
        signature
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  return (
    <div>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {!account ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <div>
          <p>Address：{account}</p>
          <p>Balance：{balance} FLOW</p>
          <p>Chain ID: {chainId}</p>


          <div>
            <input type="text" placeholder="Enter the recipient address" onChange={e => setToAddress(e.target.value)} />
            <br />
            <button onClick={() => sendTransaction(toAddress, '0.01')}>
              send 0.01 FLOW to {toAddress}
            </button>
          </div>

          <div>
            <input type="text" placeholder="Enter the message to sign" onChange={e => setMessage(e.target.value)} />
            <br />
            <button onClick={() => signMessage(message)}>
              Sign Message
            </button>
            <br />
            <p>Signature: {JSON.stringify(signature)}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WalletConnect;