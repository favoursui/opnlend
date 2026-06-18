import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther } from "viem";
import { CONTRACTS, LIQUIDATOR_ABI } from "@/config/contracts";

export function useIsLiquidatable(borrower?: `0x${string}`) {
  const { data } = useReadContract({
    address: CONTRACTS.liquidator,
    abi: LIQUIDATOR_ABI,
    functionName: "isLiquidatable",
    args: borrower ? [borrower] : undefined,
    query: { enabled: !!borrower },
  });
  return !!data;
}

export function useLiquidate() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const liquidate = (borrower: `0x${string}`, debtAmountEth: string) => {
    writeContract({
      address: CONTRACTS.liquidator,
      abi: LIQUIDATOR_ABI,
      functionName: "liquidate",
      args: [borrower],
      value: parseEther(debtAmountEth),
    });
  };

  return { liquidate, isPending, isConfirming, isSuccess, hash, error };
}
