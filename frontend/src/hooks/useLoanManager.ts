import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, LOAN_MANAGER_ABI } from "@/config/contracts";

export function useBorrow() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const borrow = (amountEth: string) => {
    writeContract({
      address: CONTRACTS.loanManager,
      abi: LOAN_MANAGER_ABI,
      functionName: "borrow",
      args: [parseEther(amountEth)],
    });
  };

  return { borrow, isPending, isConfirming, isSuccess, hash, error };
}

export function useRepay() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const repay = (amountEth: string) => {
    writeContract({
      address: CONTRACTS.loanManager,
      abi: LOAN_MANAGER_ABI,
      functionName: "repay",
      value: parseEther(amountEth),
    });
  };

  return { repay, isPending, isConfirming, isSuccess, hash, error };
}
