import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { useAccount } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, LENDING_POOL_ABI, formatOPN } from "@/config/contracts";

export function usePoolStats() {
  const r = (fn: string) => ({ address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI, functionName: fn as any });
  const { data: totalSupplied }    = useReadContract(r("totalSupplied"));
  const { data: totalBorrowed }    = useReadContract(r("totalBorrowed"));
  const { data: totalCollateral }  = useReadContract(r("totalCollateral"));
  const { data: availableLiquidity } = useReadContract(r("availableLiquidity"));
  const { data: utilisationBps }   = useReadContract(r("utilisationBps"));
  const { data: supplyAprBps }     = useReadContract(r("supplyAprBps"));

  return {
    totalSupplied:     totalSupplied     ? formatOPN(totalSupplied as bigint)     : "0.0000",
    totalBorrowed:     totalBorrowed     ? formatOPN(totalBorrowed as bigint)     : "0.0000",
    totalCollateral:   totalCollateral   ? formatOPN(totalCollateral as bigint)   : "0.0000",
    availableLiquidity: availableLiquidity ? formatOPN(availableLiquidity as bigint) : "0.0000",
    utilisationPct:    utilisationBps    ? (Number(utilisationBps) / 100).toFixed(2) : "0.00",
    supplyAprPct:      supplyAprBps      ? (Number(supplyAprBps) / 100).toFixed(2)   : "0.00",
  };
}

export function usePosition() {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: CONTRACTS.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getPosition",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  const { data: borrowApr } = useReadContract({
    address: CONTRACTS.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "borrowAprBps",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  return {
    collateral: data ? formatOPN(data[0] as bigint) : "0.0000",
    debt:       data ? formatOPN(data[1] as bigint) : "0.0000",
    limit:      data ? formatOPN(data[2] as bigint) : "0.0000",
    hf:         data ? data[3] as bigint : BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"),
    borrowAprPct: borrowApr ? (Number(borrowApr) / 100).toFixed(2) : "4.38",
    rawCollateral: data ? data[0] as bigint : 0n,
    rawDebt: data ? data[1] as bigint : 0n,
    refetch,
  };
}

export function useSupplyInfo() {
  const { address } = useAccount();
  const { data, refetch } = useReadContract({
    address: CONTRACTS.lendingPool,
    abi: LENDING_POOL_ABI,
    functionName: "getSupplyInfo",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });
  return {
    supplied:    data ? formatOPN(data[0] as bigint) : "0.0000",
    shares:      data ? data[1] as bigint : 0n,
    yieldEarned: data ? formatOPN(data[2] as bigint, 6) : "0.000000",
    rawYield:    data ? data[2] as bigint : 0n,
    supplyAprPct: data ? (Number(data[3]) / 100).toFixed(2) : "0.00",
    refetch,
  };
}

// Write hooks
export function useSupply() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const supply = (amountEth: string) => writeContract({
    address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI,
    functionName: "supply", value: parseEther(amountEth),
  });
  return { supply, isPending, isConfirming, isSuccess, hash, error };
}

export function useDepositCollateral() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const depositCollateral = (amountEth: string) => writeContract({
    address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI,
    functionName: "depositCollateral", value: parseEther(amountEth),
  });
  return { depositCollateral, isPending, isConfirming, isSuccess, hash, error };
}

export function useWithdrawCollateral() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withdrawCollateral = (amountEth: string) => writeContract({
    address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI,
    functionName: "withdrawCollateral", args: [parseEther(amountEth)],
  });
  return { withdrawCollateral, isPending, isConfirming, isSuccess, error };
}

export function useWithdrawSupply() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const withdrawSupply = (shares: bigint) => writeContract({
    address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI,
    functionName: "withdrawSupply", args: [shares],
  });
  return { withdrawSupply, isPending, isConfirming, isSuccess, error };
}

export function useClaimYield() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });
  const claimYield = () => writeContract({
    address: CONTRACTS.lendingPool, abi: LENDING_POOL_ABI,
    functionName: "claimYield",
  });
  return { claimYield, isPending, isConfirming, isSuccess, error };
}
