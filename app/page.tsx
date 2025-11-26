"use client";

import { useState, useEffect } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { RainbowKitProvider, darkTheme } from '@rainbow-me/rainbowkit';
import { WagmiConfig, createConfig, http } from 'wagmi';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@rainbow-me/rainbowkit/styles.css';

const queryClient = new QueryClient();

// Arc Testnet konfigürasyonu
const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  network: "arc-testnet",
  nativeCurrency: {
    decimals: 18,
    name: "ARC",
    symbol: "ARC",
  },
  rpcUrls: {
    public: { http: ["https://rpc.testnet.arc.network/"] },
    default: { http: ["https://rpc.testnet.arc.network/"] },
  },
  blockExplorers: {
    default: { name: "Arc Explorer", url: "https://testnet.explorer.arc.network" },
  },
  testnet: true,
};

// Token contract adresleri
const TOKENS = {
  USDC: {
    address: "0x3600000000000000000000000000000000000000",
    symbol: "USDC",
    decimals: 6,
    name: "USD Coin"
  },
  EURC: {
    address: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a",
    symbol: "EURC", 
    decimals: 6,
    name: "Euro Coin"
  }
};

// ERC20 ABI - transfer fonksiyonu için
const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable'
  },
  {
    name: 'balanceOf',
    type: 'function',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view'
  },
  {
    name: 'decimals',
    type: 'function',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view'
  }
] as const;

const wagmiConfig = createConfig({
  chains: [arcTestnet],
  transports: { [arcTestnet.id]: http() },
});

// Global CSS için component
function GlobalStyles() {
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      /* Tüm beyaz boşlukları kaldır ve mobile optimize et */
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      html, body {
        margin: 0;
        padding: 0;
        width: 100%;
        height: 100%;
        overflow-x: hidden;
        font-family: system-ui, -apple-system, sans-serif;
      }
      
      body {
        background: linear-gradient(135deg, #020815 0%, #041A2C 50%, #063450 100%);
      }

      /* Mobile için responsive font sizes */
      @media (max-width: 768px) {
        html {
          font-size: 14px;
        }
      }

      @media (max-width: 480px) {
        html {
          font-size: 12px;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return null;
}

// Client-side only balance component
function BalanceDisplay({ isConnected, balance, selectedToken }: { 
  isConnected: boolean; 
  balance: bigint | undefined; 
  selectedToken: string; 
}) {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const formatBalance = (balance: bigint | undefined) => {
    if (!balance) return "0";
    const token = TOKENS[selectedToken as keyof typeof TOKENS];
    return (Number(balance) / 10 ** token.decimals).toFixed(4);
  };

  if (!isClient) {
    return <div style={{marginTop: '0.5rem', color: '#00E6FF', fontSize: '0.9rem'}}>Loading...</div>;
  }

  if (!isConnected) {
    return null;
  }

  return (
    <div style={{marginTop: '0.5rem', color: '#00E6FF', fontSize: '0.9rem'}}>
      Balance: {formatBalance(balance)} {selectedToken}
    </div>
  );
}

// Token Transfer Component - Mobile responsive
function TokenTransfer() {
  const { address, isConnected } = useAccount();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedToken, setSelectedToken] = useState("USDC");
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  const { data: hash, writeContract, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  // Balance okuma - hydration için enabled kontrolü
  const { data: balance } = useReadContract({
    address: TOKENS[selectedToken as keyof typeof TOKENS].address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address!],
    query: { 
      enabled: !!address && !!selectedToken 
    }
  });

  const handleTransfer = async () => {
    if (!to || !amount || !isConnected) return;

    const token = TOKENS[selectedToken as keyof typeof TOKENS];
    const amountInWei = BigInt(parseFloat(amount) * 10 ** token.decimals);

    writeContract({
      address: token.address,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [to, amountInWei],
    });
  };

  // Buton stilleri - premium design
  const getButtonStyles = () => {
    const isDisabled = !isConnected || isPending || !to || !amount;
    
    return {
      width: '100%',
      background: isDisabled ? '#2A3346' : '#6366F1',
      color: '#FFFFFF',
      fontWeight: 'bold',
      padding: '1rem 1.5rem',
      borderRadius: '12px',
      border: 'none',
      cursor: isDisabled ? 'not-allowed' : 'pointer',
      fontSize: '1.125rem',
      opacity: isDisabled ? 0.6 : 1,
      boxShadow: isDisabled ? 'none' : '0 4px 15px rgba(99, 102, 241, 0.3)',
      transition: 'all 0.3s ease'
    } as const;
  };

  if (!isClient) {
    return (
      <div style={{
        background: '#111A29',
        border: '1px solid #2A3346',
        borderRadius: '20px',
        padding: '1.5rem',
        maxWidth: '500px',
        margin: '0 auto 2rem auto',
        width: '90%'
      }}>
        <div style={{color: '#00E6FF', textAlign: 'center'}}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#111A29',
      border: '1px solid #2A3346',
      borderRadius: '20px',
      padding: '1.5rem',
      maxWidth: '500px',
      margin: '0 auto 2rem auto',
      width: '90%',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
    }}>
      <h2 style={{
        fontSize: 'clamp(1.5rem, 4vw, 2rem)', 
        color: '#FFFFFF',
        marginBottom: '1.5rem', 
        textAlign: 'center',
        fontWeight: 'bold'
      }}>
        Send Tokens
      </h2>
      
      {/* Token Seçimi - Mobile responsive */}
      <div style={{marginBottom: '1.5rem', textAlign: 'center'}}>
        <label style={{color: '#FFFFFF', marginBottom: '0.5rem', display: 'block'}}>Select Token</label>
        <div style={{
          display: 'flex', 
          gap: '0.5rem', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          {Object.keys(TOKENS).map(token => (
            <button
              key={token}
              onClick={() => setSelectedToken(token)}
              style={{
                background: selectedToken === token ? '#6366F1' : '#021223',
                border: selectedToken === token ? 'none' : '1px solid #00E4FF',
                borderRadius: '10px',
                padding: '0.6rem 1.2rem',
                color: selectedToken === token ? '#FFFFFF' : '#00E6FF',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: selectedToken === token 
                  ? '0 4px 15px rgba(99, 102, 241, 0.4)' 
                  : '0 0 10px rgba(0, 228, 255, 0.3)',
                fontSize: '0.9rem',
                minWidth: '80px'
              }}
              onMouseOver={(e) => {
                if (selectedToken !== token) {
                  (e.target as HTMLButtonElement).style.boxShadow = '0 0 15px rgba(0, 228, 255, 0.5)';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                }
              }}
              onMouseOut={(e) => {
                if (selectedToken !== token) {
                  (e.target as HTMLButtonElement).style.boxShadow = '0 0 10px rgba(0, 228, 255, 0.3)';
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                }
              }}
            >
              {token}
            </button>
          ))}
        </div>
        
        {/* Balance Display - Client-side only */}
        <BalanceDisplay 
          isConnected={isConnected} 
          balance={balance} 
          selectedToken={selectedToken} 
        />
      </div>

      <div style={{display: 'flex', flexDirection: 'column', gap: '1.2rem'}}>
        <div>
          <label style={{display: 'block', textAlign: 'left', color: '#FFFFFF', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
            Recipient wallet address (0x...)
          </label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="0x..."
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '12px',
              background: '#020815',
              border: '1px solid #2A3346',
              color: '#FFFFFF',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#00E4FF';
              (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0, 228, 255, 0.1)';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#2A3346';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
            }}
          />
        </div>
        
        <div>
          <label style={{display: 'block', textAlign: 'left', color: '#FFFFFF', marginBottom: '0.5rem', fontSize: '0.9rem'}}>
            Amount
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
            step="0.001"
            style={{
              width: '100%',
              padding: '0.875rem',
              borderRadius: '12px',
              background: '#020815',
              border: '1px solid #2A3346',
              color: '#FFFFFF',
              transition: 'all 0.3s ease',
              fontSize: '0.9rem'
            }}
            onFocus={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#00E4FF';
              (e.target as HTMLInputElement).style.boxShadow = '0 0 0 3px rgba(0, 228, 255, 0.1)';
            }}
            onBlur={(e) => {
              (e.target as HTMLInputElement).style.borderColor = '#2A3346';
              (e.target as HTMLInputElement).style.boxShadow = 'none';
            }}
          />
        </div>

        <button 
          onClick={handleTransfer}
          disabled={!isConnected || isPending || !to || !amount}
          style={getButtonStyles()}
          onMouseOver={(e) => {
            if (!isConnected || isPending || !to || !amount) return;
            (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 6px 20px rgba(99, 102, 241, 0.4)';
          }}
          onMouseOut={(e) => {
            if (!isConnected || isPending || !to || !amount) return;
            (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
            (e.target as HTMLButtonElement).style.boxShadow = '0 4px 15px rgba(99, 102, 241, 0.3)';
          }}
        >
          {isPending ? 'Confirming...' : isConfirming ? 'Processing...' : `Send ${selectedToken}`}
        </button>

        {hash && (
          <div style={{
            color: '#00E6FF', 
            fontSize: '0.8rem', 
            textAlign: 'center',
            background: '#021223',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #00E4FF',
            boxShadow: '0 0 10px rgba(0, 228, 255, 0.2)',
            wordBreak: 'break-all'
          }}>
            Transaction Hash: {hash.slice(0, 10)}...{hash.slice(-8)}
          </div>
        )}

        {isConfirmed && (
          <div style={{
            color: '#00E6FF', 
            fontSize: '0.8rem', 
            textAlign: 'center',
            background: '#021223',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #00E4FF',
            boxShadow: '0 0 15px rgba(0, 228, 255, 0.3)'
          }}>
            ✅ Transfer Successful!
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <div style={{
      background: 'linear-gradient(135deg, #020815 0%, #041A2C 50%, #063450 100%)', 
      color: 'white', 
      minHeight: '100vh', 
      width: '100vw',
      margin: 0,
      padding: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
        background: '#111A29',
        border: '1px solid #2A3346',
        borderRadius: '20px',
        padding: '2rem'
      }}>
        <div style={{
          fontSize: 'clamp(1.2rem, 4vw, 1.5rem)',
          color: '#00F0FF',
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          ArcPay MVP Loading...
        </div>
      </div>
    </div>;
  }

  return (
    <>
      <GlobalStyles />
      <WagmiConfig config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <RainbowKitProvider chains={[arcTestnet]} theme={darkTheme()}>
            {/* MOBILE RESPONSIVE NAVBAR */}
            <nav style={{
              display: 'flex',
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: 'clamp(0.75rem, 3vw, 1rem) clamp(1rem, 4vw, 2rem)',
              background: '#020815',
              borderBottom: '1px solid #2A3346',
              boxShadow: '0 4px 30px rgba(0, 0, 0, 0.5)',
              width: '100%',
              margin: 0,
              flexWrap: 'wrap',
              gap: '1rem'
            }}>
              {/* SOL: BÜYÜK LOGO + İsim - Mobile responsive */}
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: 'clamp(0.5rem, 2vw, 1rem)',
                flex: '1 1 auto',
                minWidth: '200px'
              }}>
                <img 
                  src="/arc-logo.png" 
                  alt="Arc Network" 
                  style={{
                    width: 'clamp(60px, 8vw, 80px)', // MOBILE BÜYÜK LOGO
                    height: 'clamp(45px, 6vw, 60px)',
                    borderRadius: '10px',
                    border: '2px solid #00E4FF',
                    boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
                    objectFit: 'contain'
                  }}
                />
                <span style={{
                  fontSize: 'clamp(1.2rem, 4vw, 1.75rem)',
                  fontWeight: 'bold',
                  color: '#00F0FF',
                  textShadow: '0 0 20px rgba(0, 240, 255, 0.5)',
                  whiteSpace: 'nowrap'
                }}>
                  ArcPay MVP
                </span>
              </div>

              {/* ORTA: Mobile responsive Social Links - Tablet/Mobile'da gizle */}
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 'clamp(0.25rem, 1vw, 0.75rem)',
                flex: '2 1 auto',
                '@media (max-width: 768px)': {
                  display: 'none' // Mobile'da social links gizli
                }
              }}>
                {[
                  { name: 'Discord', url: 'https://discord.gg/arc', emoji: '💬' },
                  { name: 'X', url: 'https://x.com/arc', emoji: '🐦' },
                  { name: 'Explorer', url: 'https://explorer.arc.network', emoji: '🔍' },
                  { name: 'Faucet', url: 'https://faucet.arc.network', emoji: '⚡' }
                ].map((item) => (
                  <a
                    key={item.name}
                    href={item.url}
                    target="_blank"
                    style={{
                      background: '#021223',
                      border: '1px solid #00E4FF',
                      borderRadius: '8px',
                      padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(0.75rem, 2vw, 1.25rem)',
                      color: '#00E6FF',
                      fontWeight: '600',
                      cursor: 'pointer',
                      textDecoration: 'none',
                      transition: 'all 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      boxShadow: '0 0 10px rgba(0, 228, 255, 0.2)',
                      fontSize: 'clamp(0.7rem, 2vw, 0.9rem)',
                      whiteSpace: 'nowrap'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = '#063450';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 228, 255, 0.4)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = '#021223';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 0 10px rgba(0, 228, 255, 0.2)';
                    }}
                  >
                    <span style={{fontSize: 'clamp(0.8rem, 2vw, 1rem)'}}>{item.emoji}</span>
                    <span style={{'@media (max-width: 1024px)': { display: 'none' }}}>
                      {item.name}
                    </span>
                  </a>
                ))}
              </div>

              {/* SAĞ: Connect Wallet - Mobile için tam genişlik */}
              <div style={{
                display: 'flex', 
                justifyContent: 'flex-end',
                flex: '1 1 auto',
                minWidth: '140px'
              }}>
                <ConnectButton />
              </div>
            </nav>

            {/* MOBILE RESPONSIVE ANA İÇERİK */}
            <main style={{
              minHeight: 'calc(100vh - 80px)',
              background: 'linear-gradient(135deg, #020815 0%, #041A2C 50%, #063450 100%)',
              color: 'white',
              padding: 'clamp(1rem, 3vw, 2rem)',
              textAlign: 'center',
              width: '100%',
              margin: 0
            }}>
              <div>
                <h1 style={{
                  fontSize: 'clamp(1.8rem, 6vw, 3.5rem)', 
                  marginBottom: 'clamp(0.5rem, 2vw, 1rem)',
                  color: '#FFFFFF',
                  fontWeight: 'bold',
                  lineHeight: '1.2'
                }}>
                  The Fastest Way to Send <span style={{color: '#00E6FF'}}>USDC&EURO</span> on Arc
                </h1>
                
                <p style={{
                  fontSize: 'clamp(0.9rem, 3vw, 1.25rem)', 
                  marginBottom: 'clamp(1.5rem, 4vw, 3rem)', 
                  color: '#FFFFFF',
                  background: '#111A29',
                  padding: 'clamp(0.75rem, 2vw, 1rem) clamp(1rem, 3vw, 2rem)',
                  borderRadius: '15px',
                  border: '1px solid #2A3346',
                  display: 'inline-block',
                  maxWidth: '90%'
                }}>
                  Built on Arc Network — Programmable, Scalable, Low-Fee Financial Rails.
                </p>

                {/* TOKEN TRANSFER COMPONENT */}
                <TokenTransfer />

                {/* FOOTER */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: '#8C99A9',
                  fontSize: 'clamp(0.7rem, 2vw, 0.875rem)',
                  background: '#111A29',
                  padding: 'clamp(1rem, 2vw, 1.5rem)',
                  borderRadius: '15px',
                  border: '1px solid #2A3346',
                  marginTop: 'clamp(1rem, 3vw, 2rem)',
                  width: '90%',
                  maxWidth: '500px',
                  marginLeft: 'auto',
                  marginRight: 'auto'
                }}>
                  <div>© 2025 ArcPay MVP — Built on Arc Network</div>
                  <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00E6FF'}}>
                    <a 
                      href="https://x.com/mustafa29460849" 
                      target="_blank" 
                      style={{
                        color: '#00E6FF', 
                        textDecoration: 'none',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.textDecoration = 'underline';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.textDecoration = 'none';
                      }}
                    >
                      Powered By VENUS
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiConfig>
    </>
  );
}

export default App;
